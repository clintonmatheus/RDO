import { capaDoRelatorio, fotosDoPeriodo, legendasDoRelatorio } from './relatorio';
import { OBRAS_INICIAIS } from '../domain/obras';
import { criarFoto, type Foto } from '../domain/foto';

const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;
const f = (id: string, data: string, hora = '12:00', extra: Partial<Foto> = {}): Foto => ({
  ...criarFoto({ id, obraId: 'ubs', uri: `file://${id}.jpg`, origem: 'camera', capturadaEm: `${data}T${hora}:00.000Z` }), ...extra,
});

describe('capaDoRelatorio', () => {
  it('monta a capa com nº da medição e dados da obra', () => {
    const c = capaDoRelatorio(ubs, '10');
    expect(c.titulo1).toBe('RELATÓRIO FOTOGRÁFICO MEDIÇÃO Nº 10');
    expect(c.titulo2).toBe('CONCORRÊNCIA ELETRÔNICA Nº 22.003/2025');
    expect(c.titulo3).toBe('PROCESSO N° 20260490567-SEINFRA');
    expect(c.objeto).toMatch(/^CONTRATAÇÃO DE EMPRESA DE ENGENHARIA/);
  });
  it('nº com um dígito ganha zero à esquerda; sem nº, só o título', () => {
    expect(capaDoRelatorio(ubs, '7').titulo1).toBe('RELATÓRIO FOTOGRÁFICO MEDIÇÃO Nº 07');
    expect(capaDoRelatorio(ubs, '  ').titulo1).toBe('RELATÓRIO FOTOGRÁFICO');
  });
  it('todas as obras têm dados de capa', () => {
    for (const o of OBRAS_INICIAIS) expect(capaDoRelatorio(o, '1').objeto.length).toBeGreaterThan(10);
  });
});

describe('fotosDoPeriodo', () => {
  it('filtra pelo período, ignora excluídas e sem arquivo, e ordena por data e hora', () => {
    const lista = [
      f('c', '2026-11-03', '15:00'), f('a', '2026-11-01'), f('b', '2026-11-03', '10:00'),
      f('fora', '2026-12-01'), f('exc', '2026-11-02', '12:00', { excluida: true }), f('sem', '2026-11-02', '12:00', { uri: '' }),
    ];
    expect(fotosDoPeriodo(lista, { inicio: '2026-11-01', fim: '2026-11-30' }).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('legenda é a data dd/mm/aaaa', () => {
    expect(legendasDoRelatorio([f('a', '2026-11-03')])).toEqual(['03/11/2026']);
  });
});
