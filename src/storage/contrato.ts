import type { RegistroDiario } from '../domain/registro';
import type { Foto } from '../domain/foto';

export interface RepositorioRegistros {
  salvar(registro: RegistroDiario): Promise<void>;
  obter(obraId: string, data: string): Promise<RegistroDiario | undefined>;
  /** Registros da obra com data entre `de` e `ate` (inclusive), em ordem crescente. */
  listar(obraId: string, de?: string, ate?: string): Promise<RegistroDiario[]>;
}

export interface RepositorioFotos {
  salvar(foto: Foto): Promise<void>;
  remover(id: string): Promise<void>;
  /** Fotos do dia, em ordem de captura. */
  listarPorDia(obraId: string, data: string): Promise<Foto[]>;
  listarPorObra(obraId: string): Promise<Foto[]>;
}
