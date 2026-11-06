import { criarRegistroDiario } from '../domain/registro';
import { criarFoto } from '../domain/foto';
import type { Cursores, FilaEnvio, RepositorioAnotacoes, RepositorioFotos, RepositorioRegistros } from './contrato';
import { nota } from '../testes/fabricas';
import { excluirAnotacao } from '../domain/anotacao';
import { USUARIO_TESTE } from '../testes/fabricas';

export function testarRepositorioRegistros(nome: string, criar: () => Promise<RepositorioRegistros>) {
  describe(`RepositorioRegistros (${nome})`, () => {
    let repo: RepositorioRegistros;
    beforeEach(async () => { repo = await criar(); });

    const reg = (data: string, obraId = 'ubs', motivo?: string) =>
      criarRegistroDiario({ obraId, data, ritmo: 'normal', semExpediente: motivo });

    it('retorna undefined quando não existe', async () => {
      expect(await repo.obter('ubs', '2026-11-05')).toBeUndefined();
    });

    it('salva e recupera o registro idêntico', async () => {
      const r = reg('2026-11-05', 'ubs', 'Chuva');
      await repo.salvar(r);
      expect(await repo.obter('ubs', '2026-11-05')).toEqual(r);
    });

    it('salvar o mesmo dia substitui o registro', async () => {
      await repo.salvar(reg('2026-11-05', 'ubs', 'A'));
      await repo.salvar(reg('2026-11-05', 'ubs', 'B'));
      expect((await repo.obter('ubs', '2026-11-05'))?.semExpediente).toEqual({ motivo: 'B' });
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

export function testarRepositorioFotosSync(nome: string, criar: () => Promise<RepositorioFotos>) {
  describe(`RepositorioFotos — sincronização (${nome})`, () => {
    const cam = (id: string) =>
      criarFoto({ id, obraId: 'ubs', uri: `file://${id}.jpg`, origem: 'camera', capturadaEm: '2026-11-05T15:00:00.000Z' });

    it('obtém por id, inclusive excluída, e oculta excluídas nas listagens', async () => {
      const repo = await criar();
      await repo.salvar({ ...cam('a'), excluida: true, caminhoRemoto: 'ubs/a.jpg' });
      await repo.salvar(cam('b'));
      expect((await repo.obter('a'))?.caminhoRemoto).toBe('ubs/a.jpg');
      expect((await repo.listarPorDia('ubs', '2026-11-05')).map((f) => f.id)).toEqual(['b']);
      expect((await repo.listarPorObra('ubs')).map((f) => f.id)).toEqual(['b']);
      expect(await repo.obter('zzz')).toBeUndefined();
      await repo.salvar({ ...cam('c'), uri: '', caminhoRemoto: 'ubs/c.jpg' });
      expect((await repo.listarSemArquivo()).map((f) => f.id)).toEqual(['c']);
    });
  });
}

export function testarRepositorioAnotacoes(nome: string, criar: () => Promise<RepositorioAnotacoes>) {
  describe(`RepositorioAnotacoes (${nome})`, () => {
    it('salva, obtém e substitui pelo id', async () => {
      const repo = await criar();
      const a = nota('ubs', '2026-11-05', 'Reboco');
      await repo.salvar(a);
      expect(await repo.obter(a.id)).toEqual(a);
      await repo.salvar({ ...a, texto: 'Reboco interno' });
      expect((await repo.obter(a.id))?.texto).toBe('Reboco interno');
      expect(await repo.obter('nada')).toBeUndefined();
    });

    it('lista por obra e período, em ordem de criação, sem excluídas', async () => {
      const repo = await criar();
      await repo.salvar(nota('ubs', '2026-11-05', 'tarde', '18:00'));
      await repo.salvar(nota('ubs', '2026-11-05', 'manhã', '11:00'));
      await repo.salvar(nota('ubs', '2026-11-09', 'fora', '11:00'));
      await repo.salvar(nota('caps', '2026-11-05', 'outra obra'));
      await repo.salvar(excluirAnotacao(nota('ubs', '2026-11-05', 'apagada'), USUARIO_TESTE, '2026-11-05T19:00:00.000Z'));
      expect((await repo.listar('ubs', '2026-11-01', '2026-11-07')).map((a) => a.texto)).toEqual(['manhã', 'tarde']);
    });
  });
}

export function testarFilaECursores(nome: string, criar: () => Promise<{ fila: FilaEnvio; cursores: Cursores }>) {
  describe(`Fila de envio e cursores (${nome})`, () => {
    it('fila não duplica a mesma chave e mantém a ordem', async () => {
      const { fila } = await criar();
      await fila.adicionar('registro', 'ubs|2026-11-05');
      await fila.adicionar('anotacao', 'a1');
      await fila.adicionar('registro', 'ubs|2026-11-05');
      expect(await fila.listar()).toEqual([{ tipo: 'registro', chave: 'ubs|2026-11-05' }, { tipo: 'anotacao', chave: 'a1' }]);
      await fila.remover('registro', 'ubs|2026-11-05');
      expect(await fila.listar()).toEqual([{ tipo: 'anotacao', chave: 'a1' }]);
      expect(await fila.contem('anotacao', 'a1')).toBe(true);
      expect(await fila.contem('foto', 'a1')).toBe(false);
    });

    it('cursores guardam o último ponto baixado por tabela', async () => {
      const { cursores } = await criar();
      expect(await cursores.obter('registros')).toBeUndefined();
      await cursores.definir('registros', '2026-11-05T10:00:00Z');
      await cursores.definir('registros', '2026-11-05T11:00:00Z');
      expect(await cursores.obter('registros')).toBe('2026-11-05T11:00:00Z');
    });
  });
}
