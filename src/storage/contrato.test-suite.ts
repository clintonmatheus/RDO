import { criarRegistroDiario } from '../domain/registro';
import { criarFoto } from '../domain/foto';
import type { RepositorioFotos, RepositorioRegistros } from './contrato';

export function testarRepositorioRegistros(nome: string, criar: () => Promise<RepositorioRegistros>) {
  describe(`RepositorioRegistros (${nome})`, () => {
    let repo: RepositorioRegistros;
    beforeEach(async () => { repo = await criar(); });

    const reg = (data: string, obraId = 'ubs', anotacoes = 'x') =>
      criarRegistroDiario({ obraId, data, anotacoes: [anotacoes], ritmo: 'normal' });

    it('retorna undefined quando não existe', async () => {
      expect(await repo.obter('ubs', '2026-11-05')).toBeUndefined();
    });

    it('salva e recupera o registro idêntico', async () => {
      const r = reg('2026-11-05', 'ubs', 'Reboco');
      await repo.salvar(r);
      expect(await repo.obter('ubs', '2026-11-05')).toEqual(r);
    });

    it('salvar o mesmo dia substitui o registro', async () => {
      await repo.salvar(reg('2026-11-05', 'ubs', 'A'));
      await repo.salvar(reg('2026-11-05', 'ubs', 'B'));
      expect((await repo.obter('ubs', '2026-11-05'))?.anotacoes).toEqual(['B']);
      expect(await repo.listar('ubs')).toHaveLength(1);
    });

    it('lista por obra, ordenado por data, filtrando período', async () => {
      await repo.salvar(reg('2026-11-03'));
      await repo.salvar(reg('2026-11-01'));
      await repo.salvar(reg('2026-11-02', 'caps'));
      await repo.salvar(reg('2026-11-10'));
      expect((await repo.listar('ubs')).map((r) => r.data)).toEqual(['2026-11-01', '2026-11-03', '2026-11-10']);
      expect((await repo.listar('ubs', '2026-11-02', '2026-11-05')).map((r) => r.data)).toEqual(['2026-11-03']);
    });
  });
}

export function testarRepositorioFotos(nome: string, criar: () => Promise<RepositorioFotos>) {
  describe(`RepositorioFotos (${nome})`, () => {
    let repo: RepositorioFotos;
    beforeEach(async () => { repo = await criar(); });

    const cam = (id: string, hora: string, obraId = 'ubs') =>
      criarFoto({ id, obraId, uri: `file://${id}.jpg`, origem: 'camera', capturadaEm: `2026-11-05T${hora}:00.000Z`, descricao: id });

    it('salva e lista por dia em ordem de captura', async () => {
      await repo.salvar(cam('b', '15:00'));
      await repo.salvar(cam('a', '12:00'));
      const lista = await repo.listarPorDia('ubs', '2026-11-05');
      expect(lista.map((f) => f.id)).toEqual(['a', 'b']);
      expect(lista[0]).toEqual(cam('a', '12:00'));
    });

    it('preserva foto de galeria não confiável', async () => {
      const g = criarFoto({ id: 'g', obraId: 'ubs', uri: 'file://g.jpg', origem: 'galeria', capturadaEm: '2026-11-05T12:00:00.000Z', dataManual: '2026-11-04' });
      await repo.salvar(g);
      const [lida] = await repo.listarPorDia('ubs', '2026-11-04');
      expect(lida).toEqual(g);
      expect(lida.dataConfiavel).toBe(false);
    });

    it('lista por obra e remove', async () => {
      await repo.salvar(cam('a', '12:00'));
      await repo.salvar(cam('c', '12:00', 'caps'));
      expect(await repo.listarPorObra('ubs')).toHaveLength(1);
      await repo.remover('a');
      expect(await repo.listarPorObra('ubs')).toHaveLength(0);
    });
  });
}
