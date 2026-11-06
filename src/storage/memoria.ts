import type { Anotacao } from '../domain/anotacao';
import type { Foto } from '../domain/foto';
import type { RegistroDiario } from '../domain/registro';
import type {
  Armazenamento, Cursores, FilaEnvio, Pendencia, RepositorioAnotacoes, RepositorioFotos, RepositorioRegistros, TipoPendencia,
} from './contrato';

const clonar = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const noPeriodo = (data: string, de?: string, ate?: string) => (!de || data >= de) && (!ate || data <= ate);

export class RepositorioRegistrosMemoria implements RepositorioRegistros {
  private dados = new Map<string, RegistroDiario>();
  async salvar(r: RegistroDiario) { this.dados.set(r.id, clonar(r)); }
  async obter(obraId: string, data: string) {
    const r = this.dados.get(`${obraId}|${data}`);
    return r && clonar(r);
  }
  async listar(obraId: string, de?: string, ate?: string) {
    return [...this.dados.values()]
      .filter((r) => r.obraId === obraId && noPeriodo(r.data, de, ate))
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(clonar);
  }
}

export class RepositorioFotosMemoria implements RepositorioFotos {
  private dados = new Map<string, Foto>();
  async salvar(f: Foto) { this.dados.set(f.id, clonar(f)); }
  async remover(id: string) { this.dados.delete(id); }
  async obter(id: string) {
    const f = this.dados.get(id);
    return f && clonar(f);
  }
  async listarPorObra(obraId: string) { return this.visiveis((f) => f.obraId === obraId); }
  async listarPorDia(obraId: string, data: string) { return this.visiveis((f) => f.obraId === obraId && f.data === data); }
  async listarSemArquivo() {
    return [...this.dados.values()].filter((f) => !f.excluida && !f.uri && !!f.caminhoRemoto).map(clonar);
  }
  private visiveis(filtro: (f: Foto) => boolean) {
    return [...this.dados.values()].filter((f) => !f.excluida && filtro(f))
      .sort((a, b) => a.capturadaEm.localeCompare(b.capturadaEm)).map(clonar);
  }
}

export class RepositorioAnotacoesMemoria implements RepositorioAnotacoes {
  private dados = new Map<string, Anotacao>();
  async salvar(a: Anotacao) { this.dados.set(a.id, clonar(a)); }
  async obter(id: string) {
    const a = this.dados.get(id);
    return a && clonar(a);
  }
  async listar(obraId: string, de?: string, ate?: string) {
    return [...this.dados.values()]
      .filter((a) => !a.excluida && a.obraId === obraId && noPeriodo(a.data, de, ate))
      .sort((a, b) => a.criadaEm.localeCompare(b.criadaEm)).map(clonar);
  }
}

export class FilaEnvioMemoria implements FilaEnvio {
  private itens: Pendencia[] = [];
  async adicionar(tipo: TipoPendencia, chave: string) {
    if (!(await this.contem(tipo, chave))) this.itens.push({ tipo, chave });
  }
  async listar() { return this.itens.map((p) => ({ ...p })); }
  async remover(tipo: TipoPendencia, chave: string) {
    this.itens = this.itens.filter((p) => !(p.tipo === tipo && p.chave === chave));
  }
  async contem(tipo: TipoPendencia, chave: string) {
    return this.itens.some((p) => p.tipo === tipo && p.chave === chave);
  }
}

export class CursoresMemoria implements Cursores {
  private dados = new Map<string, string>();
  async obter(t: string) { return this.dados.get(t); }
  async definir(t: string, v: string) { this.dados.set(t, v); }
}

export function criarArmazenamentoMemoria(): Armazenamento {
  return {
    registros: new RepositorioRegistrosMemoria(),
    anotacoes: new RepositorioAnotacoesMemoria(),
    fotos: new RepositorioFotosMemoria(),
    fila: new FilaEnvioMemoria(),
    cursores: new CursoresMemoria(),
  };
}
