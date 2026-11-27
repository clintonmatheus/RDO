import type { Armazenamento } from './contrato';
import { persistenciaIndexedDb } from './idb';
import { criarArmazenamentoPersistente } from './persistente';

/** Navegador / atalho do iPhone: dados e fotos ficam no IndexedDB e sobem quando há internet. */
export async function abrirArmazenamento(): Promise<Armazenamento> {
  return criarArmazenamentoPersistente(await persistenciaIndexedDb());
}
