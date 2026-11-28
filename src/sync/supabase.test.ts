jest.mock('../fotos/arquivos', () => ({ lerBytes: jest.fn(), baixarFoto: jest.fn() }));
jest.mock('./local', () => ({}));
jest.mock('react-native-url-polyfill/auto', () => ({}));
import type { SupabaseClient } from '@supabase/supabase-js';
import { RemotoSupabase } from './supabase';

/** Cliente de mentira: devolve as linhas dadas para qualquer consulta. */
function cliente(linhas: Record<string, unknown>[]) {
  const q = { gt: () => q, order: () => q, range: async () => ({ data: linhas, error: null }) };
  return { from: () => ({ select: () => q }) } as unknown as SupabaseClient;
}

describe('RemotoSupabase.baixar', () => {
  it('identidade, autor e exclusão vêm das colunas da linha, não do conteúdo', async () => {
    const r = new RemotoSupabase(cliente([{
      id: 'lx2-beto', obra_id: 'ubs', data: '2026-11-10', autor_id: 'u-beto', excluida: false, servidor_em: '2026-11-10T12:00:00Z',
      dados: { id: 'lx1-ana', obraId: 'outra', data: '2026-01-01', texto: 'FORJADO', autorId: 'u-ana', autorNome: 'Ana', excluida: true },
    }]));
    const { itens } = await r.baixarAnotacoes();
    expect(itens[0]).toMatchObject({ id: 'lx2-beto', obraId: 'ubs', data: '2026-11-10', autorId: 'u-beto', excluida: false });
  });
});
