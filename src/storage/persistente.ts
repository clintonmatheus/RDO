import type { Anotacao } from '../domain/anotacao';
import type { Foto } from '../domain/foto';
import type { RegistroDiario } from '../domain/registro';
import type { Armazenamento, Pendencia, TipoPendencia } from './contrato';
import {
  CursoresMemoria, FilaEnvioMemoria, RepositorioAnotacoesMemoria, RepositorioFotosMemoria, RepositorioRegistrosMemoria,
} from './memoria';

/** Onde os dados ficam guardados entre uma abertura e outra (navegador: IndexedDB). */
export interface Persistencia {
  carregar(loja: string): Promise<[string, unknown][]>;
  gravar(loja: string, chave: string, valor: unknown): Promise<void>;
  apagar(loja: string, chave: string): Promise<void>;
}

class Registros extends RepositorioRegistrosMemoria {
  constructor(private p: Persistencia) { super(); }
  async restaurar(v: RegistroDiario) { await super.salvar(v); }
  async salvar(r: RegistroDiario) { await super.salvar(r); await this.p.gravar('registros', r.id, r); }
}

class Anotacoes extends RepositorioAnotacoesMemoria {
  constructor(private p: Persistencia) { super(); }
  async restaurar(v: Anotacao) { await super.salvar(v); }
  async salvar(a: Anotacao) { await super.salvar(a); await this.p.gravar('anotacoes', a.id, a); }
}

class Fotos extends RepositorioFotosMemoria {
  constructor(private p: Persistencia) { super(); }
  async restaurar(v: Foto) { await super.salvar(v); }
  async salvar(f: Foto) { await super.salvar(f); await this.p.gravar('fotos', f.id, f); }
  async remover(id: string) { await super.remover(id); await this.p.apagar('fotos', id); }
}

class Fila extends FilaEnvioMemoria {
  constructor(private p: Persistencia) { super(); }
  restaurar(itens: Pendencia[]) { this.itens = itens; }
  private salvarLista = async () => { await this.p.gravar('fila', 'lista', this.itens); };
  async adicionar(tipo: TipoPendencia, chave: string) { await super.adicionar(tipo, chave); await this.salvarLista(); }
  async remover(tipo: TipoPendencia, chave: string) { await super.remover(tipo, chave); await this.salvarLista(); }
}

class Cursor extends CursoresMemoria {
  constructor(private p: Persistencia) { super(); }
  restaurar(t: string, v: string) { this.dados.set(t, v); }
  async definir(t: string, v: string) { await super.definir(t, v); await this.p.gravar('cursores', t, v); }
}

/** Armazenamento em memória que grava cada alteração em `p` e recarrega tudo ao abrir (versão web). */
export async function criarArmazenamentoPersistente(p: Persistencia): Promise<Armazenamento> {
  const registros = new Registros(p), anotacoes = new Anotacoes(p), fotos = new Fotos(p), fila = new Fila(p), cursores = new Cursor(p);
  for (const [, v] of await p.carregar('registros')) await registros.restaurar(v as RegistroDiario);
  for (const [, v] of await p.carregar('anotacoes')) await anotacoes.restaurar(v as Anotacao);
  for (const [, v] of await p.carregar('fotos')) await fotos.restaurar(v as Foto);
  const lista = (await p.carregar('fila')).find(([k]) => k === 'lista');
  if (lista) fila.restaurar(lista[1] as Pendencia[]);
  for (const [k, v] of await p.carregar('cursores')) cursores.restaurar(k, v as string);
  return { registros, anotacoes, fotos, fila, cursores };
}
