import type { Persistencia } from './persistente';

const LOJAS = ['registros', 'anotacoes', 'fotos', 'fila', 'cursores'];

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open('rdo-web', 1);
    r.onupgradeneeded = () => { for (const l of LOJAS) if (!r.result.objectStoreNames.contains(l)) r.result.createObjectStore(l); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error ?? new Error('Não foi possível abrir o armazenamento do navegador'));
  });
}

const esperar = <T,>(r: IDBRequest<T>) => new Promise<T>((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });

/** IndexedDB do navegador (não coberto por testes automatizados: depende do navegador). */
export async function persistenciaIndexedDb(): Promise<Persistencia> {
  const db = await abrir();
  const loja = (n: string, modo: IDBTransactionMode) => db.transaction(n, modo).objectStore(n);
  return {
    async carregar(n) {
      const s = loja(n, 'readonly');
      const [chaves, valores] = await Promise.all([esperar(s.getAllKeys()), esperar(s.getAll())]);
      return chaves.map((k, i) => [String(k), valores[i]] as [string, unknown]);
    },
    async gravar(n, k, v) { await esperar(loja(n, 'readwrite').put(v, k)); },
    async apagar(n, k) { await esperar(loja(n, 'readwrite').delete(k)); },
  };
}
