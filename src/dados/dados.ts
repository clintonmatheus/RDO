import { criarAnotacao, editarAnotacao, excluirAnotacao, podeAlterar, type Anotacao } from '../domain/anotacao';
import { criarFoto, type Foto, type NovaFoto } from '../domain/foto';
import { criarRegistroDiario, type NovoRegistro, type RegistroDiario } from '../domain/registro';
import type { Usuario } from '../domain/usuario';
import type { Armazenamento } from '../storage/contrato';

export interface OpcoesDados {
  agora: () => string;
  novoId: () => string;
  /** Chamado após cada alteração local (dispara a sincronização). */
  aoAlterar?: () => void;
}

/** Ponto único de leitura/gravação usado pelas telas: grava localmente, registra autoria e enfileira o envio. */
export class Dados {
  constructor(private a: Armazenamento, public readonly usuario: Usuario, private o: OpcoesDados) {}

  private alterou() { this.o.aoAlterar?.(); }

  // Registro do dia
  obterRegistro(obraId: string, data: string) { return this.a.registros.obter(obraId, data); }
  listarRegistros(obraId: string, de?: string, ate?: string) { return this.a.registros.listar(obraId, de, ate); }

  async salvarRegistro(novo: Omit<NovoRegistro, 'autor' | 'agora'>): Promise<RegistroDiario> {
    const r = criarRegistroDiario({ ...novo, autor: this.usuario, agora: this.o.agora() });
    await this.a.registros.salvar(r);
    await this.a.fila.adicionar('registro', r.id);
    this.alterou();
    return r;
  }

  // Anotações
  listarAnotacoes(obraId: string, de?: string, ate?: string) { return this.a.anotacoes.listar(obraId, de, ate); }

  async adicionarAnotacao(obraId: string, data: string, texto: string): Promise<Anotacao> {
    const a = criarAnotacao({ id: this.o.novoId(), obraId, data, texto, autor: this.usuario, agora: this.o.agora() });
    return this.gravarAnotacao(a);
  }

  async editarAnotacao(id: string, texto: string): Promise<Anotacao> {
    return this.gravarAnotacao(editarAnotacao(await this.anotacao(id), texto, this.usuario, this.o.agora()));
  }

  async excluirAnotacao(id: string): Promise<Anotacao> {
    return this.gravarAnotacao(excluirAnotacao(await this.anotacao(id), this.usuario, this.o.agora()));
  }

  private async anotacao(id: string) {
    const a = await this.a.anotacoes.obter(id);
    if (!a) throw new Error('Anotação não encontrada');
    return a;
  }

  private async gravarAnotacao(a: Anotacao) {
    await this.a.anotacoes.salvar(a);
    await this.a.fila.adicionar('anotacao', a.id);
    this.alterou();
    return a;
  }

  // Fotos
  listarFotosDoDia(obraId: string, data: string) { return this.a.fotos.listarPorDia(obraId, data); }
  listarFotosDaObra(obraId: string) { return this.a.fotos.listarPorObra(obraId); }

  async adicionarFoto(n: Omit<NovaFoto, 'id'>): Promise<Foto> {
    const agora = this.o.agora();
    const f: Foto = {
      ...criarFoto({ ...n, id: this.o.novoId() }),
      autorId: this.usuario.id, autorNome: this.usuario.nome, atualizadaEm: agora, excluida: false,
    };
    return this.gravarFoto(f);
  }

  async removerFoto(id: string): Promise<void> {
    const f = await this.a.fotos.obter(id);
    if (!f) throw new Error('Foto não encontrada');
    if (!podeAlterar(this.usuario, { autorId: f.autorId ?? this.usuario.id })) throw new Error('Sem permissão');
    await this.gravarFoto({ ...f, excluida: true, atualizadaEm: this.o.agora() });
  }

  private async gravarFoto(f: Foto) {
    await this.a.fotos.salvar(f);
    await this.a.fila.adicionar('foto', f.id);
    this.alterou();
    return f;
  }
}
