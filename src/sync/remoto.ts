import type { Anotacao } from '../domain/anotacao';
import type { Foto } from '../domain/foto';
import type { RegistroDiario } from '../domain/registro';

/** Itens alterados no servidor desde um cursor; `cursor` é o novo ponto a guardar. */
export interface Lote<T> { itens: T[]; cursor?: string }

/** Servidor central. Implementações: Supabase (app) e RemotoFalso (testes). */
export interface Remoto {
  enviarRegistro(r: RegistroDiario): Promise<void>;
  enviarAnotacao(a: Anotacao): Promise<void>;
  /** Envia os dados da foto (sem o arquivo). */
  enviarFoto(f: Foto): Promise<void>;
  /** Envia o arquivo da foto e devolve o caminho no servidor. */
  enviarArquivoFoto(f: Foto): Promise<string>;
  /** Baixa o arquivo para o aparelho e devolve o endereço local. */
  baixarArquivoFoto(f: Foto): Promise<string>;
  baixarRegistros(cursor?: string): Promise<Lote<RegistroDiario>>;
  baixarAnotacoes(cursor?: string): Promise<Lote<Anotacao>>;
  baixarFotos(cursor?: string): Promise<Lote<Foto>>;
  /** Avisa quando algo muda no servidor (tempo real). Devolve a função para cancelar. */
  aoMudar?(callback: () => void): () => void;
}
