import type { Foto } from '../domain/foto';
import type { Armazenamento, TipoPendencia } from '../storage/contrato';
import type { Lote, Remoto } from './remoto';

export interface ResultadoSync { enviados: number; recebidos: number }

const TABELA: Record<TipoPendencia, string> = { registro: 'registros', anotacao: 'anotacoes', foto: 'fotos' };

/**
 * Sincronização "offline primeiro":
 * 1. envia a fila de alterações locais (fotos: arquivo antes dos dados);
 * 2. baixa o que mudou no servidor desde o último cursor, sem sobrescrever alterações locais ainda pendentes;
 * 3. baixa arquivos de fotos que ainda não estão no aparelho.
 */
export class Sincronizador {
  private emAndamento?: Promise<ResultadoSync>;

  constructor(private a: Armazenamento, private remoto: Remoto) {}

  sincronizar(): Promise<ResultadoSync> {
    if (!this.emAndamento) {
      this.emAndamento = this.executar().finally(() => { this.emAndamento = undefined; });
    }
    return this.emAndamento;
  }

  private async executar(): Promise<ResultadoSync> {
    let enviados = 0;
    let recusa: Error | undefined;
    try {
      enviados = await this.enviar();
    } catch (e) {
      if ((e as Error).message === 'Sem conexão') throw e;
      recusa = e as Error; // ainda assim baixa o que os outros fizeram
    }
    const recebidos = await this.receber();
    await this.baixarArquivos();
    if (recusa) throw recusa;
    return { enviados, recebidos };
  }

  private async enviar(): Promise<number> {
    let n = 0;
    let recusa: Error | undefined;
    for (const p of await this.a.fila.listar()) {
      try {
        await this.enviarItem(p.tipo, p.chave);
      } catch (e) {
        if ((e as Error).message === 'Sem conexão') throw e;
        // Recusado pelo servidor (ex.: sem permissão): descarta a alteração local e
        // força baixar a tabela de novo, para a cópia local voltar à versão do servidor.
        recusa = e as Error;
        await this.a.fila.remover(p.tipo, p.chave);
        await this.a.cursores.definir(TABELA[p.tipo], '');
        continue;
      }
      await this.a.fila.remover(p.tipo, p.chave);
      n += 1;
    }
    if (recusa) throw recusa;
    return n;
  }

  private async enviarItem(tipo: TipoPendencia, chave: string): Promise<void> {
    const p = { tipo, chave };
    {
      if (p.tipo === 'registro') {
        const [obraId, data] = p.chave.split('|');
        const r = await this.a.registros.obter(obraId, data);
        if (r) await this.remoto.enviarRegistro(r);
      } else if (p.tipo === 'anotacao') {
        const x = await this.a.anotacoes.obter(p.chave);
        if (x) await this.remoto.enviarAnotacao(x);
      } else {
        let f = await this.a.fotos.obter(p.chave);
        if (f) {
          if (!f.caminhoRemoto && !f.excluida) {
            f = { ...f, caminhoRemoto: await this.remoto.enviarArquivoFoto(f) };
            await this.a.fotos.salvar(f);
          }
          await this.remoto.enviarFoto(f);
        }
      }
    }
  }

  private async aplicar<T>(
    tabela: string, tipo: TipoPendencia, baixar: (c?: string) => Promise<Lote<T>>,
    chave: (x: T) => string, obterLocal: (x: T) => Promise<T | undefined>, salvar: (x: T, local?: T) => Promise<void>,
    comparavel: (x: T) => unknown = (x) => x,
  ): Promise<number> {
    const lote = await baixar(await this.a.cursores.obter(tabela));
    let mudou = 0;
    for (const item of lote.itens) {
      if (await this.a.fila.contem(tipo, chave(item))) continue; // alteração local pendente prevalece
      const local = await obterLocal(item);
      if (local && JSON.stringify(comparavel(local)) === JSON.stringify(comparavel(item))) continue;
      await salvar(item, local);
      mudou += 1;
    }
    if (lote.cursor) await this.a.cursores.definir(tabela, lote.cursor);
    return mudou;
  }

  private async receber(): Promise<number> {
    const r = await this.aplicar('registros', 'registro', (c) => this.remoto.baixarRegistros(c), (x) => x.id,
      (x) => this.a.registros.obter(x.obraId, x.data), (x) => this.a.registros.salvar(x));
    const n = await this.aplicar('anotacoes', 'anotacao', (c) => this.remoto.baixarAnotacoes(c), (x) => x.id,
      (x) => this.a.anotacoes.obter(x.id), (x) => this.a.anotacoes.salvar(x));
    const f = await this.aplicar('fotos', 'foto', (c) => this.remoto.baixarFotos(c), (x) => x.id,
      (x) => this.a.fotos.obter(x.id), (x: Foto, local?: Foto) => this.a.fotos.salvar({ ...x, uri: local?.uri ?? '' }),
      (x: Foto) => ({ ...x, uri: '' }));
    return r + n + f;
  }

  private async baixarArquivos(): Promise<void> {
    for (const f of await this.a.fotos.listarSemArquivo()) {
      try {
        await this.a.fotos.salvar({ ...f, uri: await this.remoto.baixarArquivoFoto(f) });
      } catch {
        // tenta de novo na próxima sincronização
      }
    }
  }
}
