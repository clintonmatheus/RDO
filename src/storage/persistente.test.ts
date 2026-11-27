import type { Persistencia } from './persistente';
import { criarArmazenamentoPersistente } from './persistente';
import {
  testarFilaECursores, testarRepositorioAnotacoes, testarRepositorioFotos, testarRepositorioFotosSync, testarRepositorioRegistros,
} from './contrato.test-suite';

function banco(): Persistencia & { lojas: Record<string, Map<string, unknown>> } {
  const lojas: Record<string, Map<string, unknown>> = {};
  const loja = (n: string) => (lojas[n] ??= new Map());
  return {
    lojas,
    carregar: async (n) => [...loja(n).entries()].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))] as [string, unknown]),
    gravar: async (n, k, v) => { loja(n).set(k, JSON.parse(JSON.stringify(v))); },
    apagar: async (n, k) => { loja(n).delete(k); },
  };
}

const novo = () => criarArmazenamentoPersistente(banco());
testarRepositorioRegistros('persistente', async () => (await novo()).registros);
testarRepositorioFotos('persistente', async () => (await novo()).fotos);
testarRepositorioFotosSync('persistente', async () => (await novo()).fotos);
testarRepositorioAnotacoes('persistente', async () => (await novo()).anotacoes);
testarFilaECursores('persistente', novo);

describe('persistente: reabrir o app', () => {
  it('recupera registros, fotos, fila e cursores gravados antes', async () => {
    const b = banco();
    const a = await criarArmazenamentoPersistente(b);
    await a.fotos.salvar({ id: 'f1', obraId: 'o', uri: 'data:image/jpeg;base64,AA', origem: 'camera', capturadaEm: '2026-11-27T12:00:00.000Z', data: '2026-11-27', dataConfiavel: true });
    await a.fotos.salvar({ id: 'f2', obraId: 'o', uri: 'x', origem: 'camera', capturadaEm: '2026-11-27T13:00:00.000Z', data: '2026-11-27', dataConfiavel: true });
    await a.fotos.remover('f2');
    await a.fila.adicionar('foto', 'f1');
    await a.fila.adicionar('registro', 'o|2026-11-27');
    await a.fila.remover('registro', 'o|2026-11-27');
    await a.cursores.definir('fotos', '2026-11-27T00:00:00Z');

    const b2 = await criarArmazenamentoPersistente(b);
    expect((await b2.fotos.listarPorObra('o')).map((f) => f.id)).toEqual(['f1']);
    expect(await b2.fila.listar()).toEqual([{ tipo: 'foto', chave: 'f1' }]);
    expect(await b2.cursores.obter('fotos')).toBe('2026-11-27T00:00:00Z');
  });
});
