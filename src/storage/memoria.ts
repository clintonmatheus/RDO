import type { RegistroDiario } from '../domain/registro';
import type { Foto } from '../domain/foto';
import type { RepositorioFotos, RepositorioRegistros } from './contrato';

const clonar = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export class RepositorioRegistrosMemoria implements RepositorioRegistros {
  private dados = new Map<string, RegistroDiario>();

  async salvar(registro: RegistroDiario) {
    this.dados.set(registro.id, clonar(registro));
  }

  async obter(obraId: string, data: string) {
    const r = this.dados.get(`${obraId}|${data}`);
    return r && clonar(r);
  }

  async listar(obraId: string, de?: string, ate?: string) {
    return [...this.dados.values()]
      .filter((r) => r.obraId === obraId && (!de || r.data >= de) && (!ate || r.data <= ate))
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(clonar);
  }
}

export class RepositorioFotosMemoria implements RepositorioFotos {
  private dados = new Map<string, Foto>();

  async salvar(foto: Foto) {
    this.dados.set(foto.id, clonar(foto));
  }

  async remover(id: string) {
    this.dados.delete(id);
  }

  async listarPorObra(obraId: string) {
    return this.ordenar([...this.dados.values()].filter((f) => f.obraId === obraId));
  }

  async listarPorDia(obraId: string, data: string) {
    return this.ordenar([...this.dados.values()].filter((f) => f.obraId === obraId && f.data === data));
  }

  private ordenar(fotos: Foto[]) {
    return fotos.sort((a, b) => a.capturadaEm.localeCompare(b.capturadaEm)).map(clonar);
  }
}
