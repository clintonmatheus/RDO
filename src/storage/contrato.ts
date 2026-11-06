import type { Anotacao } from '../domain/anotacao';
import type { Foto } from '../domain/foto';
import type { RegistroDiario } from '../domain/registro';

export interface RepositorioRegistros {
  salvar(registro: RegistroDiario): Promise<void>;
  obter(obraId: string, data: string): Promise<RegistroDiario | undefined>;
  /** Registros da obra com data entre `de` e `ate` (inclusive), em ordem crescente. */
  listar(obraId: string, de?: string, ate?: string): Promise<RegistroDiario[]>;
}

export interface RepositorioFotos {
  salvar(foto: Foto): Promise<void>;
  remover(id: string): Promise<void>;
  /** Inclui fotos excluídas (usado pela sincronização). */
  obter(id: string): Promise<Foto | undefined>;
  /** Fotos do dia, em ordem de captura (sem as excluídas). */
  listarPorDia(obraId: string, data: string): Promise<Foto[]>;
  listarPorObra(obraId: string): Promise<Foto[]>;
  /** Fotos vindas do servidor cujo arquivo ainda não foi baixado. */
  listarSemArquivo(): Promise<Foto[]>;
}

export interface RepositorioAnotacoes {
  salvar(a: Anotacao): Promise<void>;
  /** Inclui anotações excluídas (usado pela sincronização). */
  obter(id: string): Promise<Anotacao | undefined>;
  /** Anotações visíveis da obra no período, em ordem de criação. */
  listar(obraId: string, de?: string, ate?: string): Promise<Anotacao[]>;
}

export type TipoPendencia = 'registro' | 'anotacao' | 'foto';
export interface Pendencia { tipo: TipoPendencia; chave: string }

/** Alterações locais ainda não enviadas ao servidor. */
export interface FilaEnvio {
  adicionar(tipo: TipoPendencia, chave: string): Promise<void>;
  listar(): Promise<Pendencia[]>;
  remover(tipo: TipoPendencia, chave: string): Promise<void>;
  contem(tipo: TipoPendencia, chave: string): Promise<boolean>;
}

/** Último ponto (horário do servidor) já baixado de cada tabela. */
export interface Cursores {
  obter(tabela: string): Promise<string | undefined>;
  definir(tabela: string, valor: string): Promise<void>;
}

export interface Armazenamento {
  registros: RepositorioRegistros;
  anotacoes: RepositorioAnotacoes;
  fotos: RepositorioFotos;
  fila: FilaEnvio;
  cursores: Cursores;
}
