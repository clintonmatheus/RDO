import JSZip from 'jszip';
import { criarFoto, type Foto } from '../domain/foto';
import { fotosDoPeriodo, gerarZipDeFotos, nomeDoZip, planejarExportacao } from './exportacao';

const f = (id: string, data: string, hora = '12:00', extra: Partial<Foto> = {}): Foto => ({
  ...criarFoto({ id, obraId: 'ubs', uri: `file:///fotos/${id}.JPG`, origem: 'camera', capturadaEm: `${data}T${hora}:00.000Z` }), ...extra,
});

describe('fotosDoPeriodo', () => {
  it('filtra pelo período, ignora excluídas e sem arquivo, e ordena por data e hora', () => {
    const lista = [f('c', '2026-11-03', '15:00'), f('a', '2026-11-01'), f('b', '2026-11-03', '10:00'),
      f('fora', '2026-12-01'), f('x', '2026-11-02', '12:00', { excluida: true }), f('s', '2026-11-02', '12:00', { uri: '' })];
    expect(fotosDoPeriodo(lista, { inicio: '2026-11-01', fim: '2026-11-30' }).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('planejarExportacao', () => {
  it('separa por pasta de data e numera as fotos de cada dia', () => {
    const p = planejarExportacao([f('a', '2026-11-01'), f('b', '2026-11-03', '10:00'), f('c', '2026-11-03', '15:00')]);
    expect(p.map((e) => e.caminho)).toEqual(['2026-11-01/2026-11-01_01.jpg', '2026-11-03/2026-11-03_01.jpg', '2026-11-03/2026-11-03_02.jpg']);
    expect(p.map((e) => e.foto.id)).toEqual(['a', 'b', 'c']);
  });
  it('mantém a extensão original do arquivo (minúscula) e usa jpg quando não há', () => {
    const p = planejarExportacao([f('a', '2026-11-01', '12:00', { uri: 'file:///x/foto.png' }), f('b', '2026-11-01', '13:00', { uri: 'content://media/123' })]);
    expect(p.map((e) => e.caminho)).toEqual(['2026-11-01/2026-11-01_01.png', '2026-11-01/2026-11-01_02.jpg']);
  });
  it('numera com dois dígitos e passa de 99 sem quebrar a ordem', () => {
    const muitas = Array.from({ length: 101 }, (_, i) => f(`f${i}`, '2026-11-01', `${String(10 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`));
    const p = planejarExportacao(muitas);
    expect(p[0].caminho).toBe('2026-11-01/2026-11-01_01.jpg');
    expect(p[100].caminho).toBe('2026-11-01/2026-11-01_101.jpg');
  });
});

describe('nomeDoZip', () => {
  it('inclui obra e período', () => {
    expect(nomeDoZip('ubs', { inicio: '2026-11-01', fim: '2026-11-30' })).toBe('Fotos_ubs_2026-11-01_a_2026-11-30.zip');
  });
});

describe('gerarZipDeFotos', () => {
  it('gera um zip com os bytes intactos nas pastas indicadas', async () => {
    const a = new Uint8Array([1, 2, 3, 250]); const b = new Uint8Array([9, 8]);
    const zip = await gerarZipDeFotos([{ caminho: '2026-11-01/2026-11-01_01.jpg', bytes: a }, { caminho: '2026-11-03/2026-11-03_01.jpg', bytes: b }]);
    const lido = await JSZip.loadAsync(zip);
    expect(Object.keys(lido.files).filter((n) => !lido.files[n].dir).sort()).toEqual(['2026-11-01/2026-11-01_01.jpg', '2026-11-03/2026-11-03_01.jpg']);
    expect(Array.from(await lido.file('2026-11-01/2026-11-01_01.jpg')!.async('uint8array'))).toEqual([1, 2, 3, 250]);
  });
});
