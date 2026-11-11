import { diaDaSemana, horaLocal } from './datas';
import type { Usuario } from './usuario';

export interface Anotacao {
  id: string;
  obraId: string;
  data: string;
  texto: string;
  autorId: string;
  autorNome: string;
  criadaEm: string;
  atualizadaEm: string;
  /** Exclusão lógica, para que a exclusão chegue aos outros aparelhos. */
  excluida: boolean;
  /** Quem fez a última edição do texto (o autor ou o administrador). */
  editadaPor?: { id: string; nome: string; admin: boolean };
}

interface NovaAnotacao {
  id: string;
  obraId: string;
  data: string;
  texto: string;
  autor: Usuario;
  agora: string;
}

function limpar(texto: string): string {
  const t = texto.trim();
  if (!t) throw new Error('Anotação vazia');
  return t;
}

export function criarAnotacao(n: NovaAnotacao): Anotacao {
  diaDaSemana(n.data); // valida
  return {
    id: n.id, obraId: n.obraId, data: n.data, texto: limpar(n.texto),
    autorId: n.autor.id, autorNome: n.autor.nome, criadaEm: n.agora, atualizadaEm: n.agora, excluida: false,
  };
}

export function podeAlterar(usuario: Usuario, a: Pick<Anotacao, 'autorId'>): boolean {
  return usuario.admin || usuario.id === a.autorId;
}

function exigirPermissao(usuario: Usuario, a: Anotacao) {
  if (!podeAlterar(usuario, a)) throw new Error('Sem permissão');
}

export function editarAnotacao(a: Anotacao, texto: string, usuario: Usuario, agora: string): Anotacao {
  exigirPermissao(usuario, a);
  return {
    ...a, texto: limpar(texto), atualizadaEm: agora,
    editadaPor: { id: usuario.id, nome: usuario.nome, admin: usuario.admin },
  };
}

export function excluirAnotacao(a: Anotacao, usuario: Usuario, agora: string): Anotacao {
  exigirPermissao(usuario, a);
  return { ...a, excluida: true, atualizadaEm: agora };
}

export function anotacoesVisiveis(lista: Anotacao[]): Anotacao[] {
  return lista.filter((a) => !a.excluida).sort((x, y) => x.criadaEm.localeCompare(y.criadaEm));
}

/** Texto exibido abaixo da anotação quando ela foi editada. */
export function descricaoEdicao(a: Anotacao): string | undefined {
  if (!a.editadaPor) return undefined;
  const hora = horaLocal(a.atualizadaEm);
  if (a.editadaPor.id === a.autorId) return `Editado às ${hora}`;
  const papel = a.editadaPor.admin ? ' (administrador)' : '';
  return `Editado por ${a.editadaPor.nome}${papel} às ${hora}`;
}
