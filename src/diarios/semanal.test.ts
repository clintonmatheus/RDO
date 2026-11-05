import { montarDiarioSemanal, diarioSemanalHtml } from './semanal';
import { criarRegistroDiario } from '../domain/registro';
import { criarFoto } from '../domain/foto';
import { OBRAS_INICIAIS } from '../domain/obras';

const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;
const usf = OBRAS_INICIAIS.find((o) => o.id === 'usf-rocas')!;
const cbtu = OBRAS_INICIAIS[0];

// 2026-11-05 é quinta-feira → semana sáb 31/10 a sex 06/11 (UBS); seg 02/11 a dom 08/11 (USF)
const registros = [
  criarRegistroDiario({ obraId: 'ubs', data: '2026-11-02', efetivo: { Servente: 2, Pedreiro: 3 }, equipamentos: { Betoneira: 1 }, ritmo: 'acelerado', anotacoes: ['Alvenaria do bloco B', 'Limpeza'] }),
  criarRegistroDiario({ obraId: 'ubs', data: '2026-11-03', semExpediente: 'Chuva' }),
  criarRegistroDiario({ obraId: 'ubs', data: '2026-11-20' }), // fora da semana
  criarRegistroDiario({ obraId: 'caps', data: '2026-11-02', anotacoes: ['outra obra'] }),
];
const fotos = [
  criarFoto({ id: 'f1', obraId: 'ubs', uri: 'file://a.jpg', origem: 'camera', capturadaEm: '2026-11-02T15:00:00.000Z' }),
  criarFoto({ id: 'f2', obraId: 'ubs', uri: 'file://b.jpg', origem: 'camera', capturadaEm: '2026-11-30T15:00:00.000Z' }),
];

describe('montarDiarioSemanal', () => {
  it('usa a semana da obra (sábado a sexta) com 7 dias', () => {
    const d = montarDiarioSemanal(ubs, '2026-11-05', registros, fotos);
    expect(d.periodo).toEqual({ inicio: '2026-10-31', fim: '2026-11-06' });
    expect(d.dias.map((x) => x.data)).toEqual(['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  });

  it('usa segunda a domingo na USF Rocas', () => {
    expect(montarDiarioSemanal(usf, '2026-11-05', [], []).periodo).toEqual({ inicio: '2026-11-02', fim: '2026-11-08' });
  });

  it('preenche dias com registro, sem expediente, vazios e fotos', () => {
    const d = montarDiarioSemanal(ubs, '2026-11-05', registros, fotos);
    const seg = d.dias.find((x) => x.data === '2026-11-02')!;
    expect(seg.status).toBe('registrado');
    expect(seg.efetivoTotal).toBe(5);
    expect(seg.efetivo).toEqual([{ funcao: 'Servente', quantidade: 2 }, { funcao: 'Pedreiro', quantidade: 3 }]);
    expect(seg.equipamentos).toEqual([{ equipamento: 'Betoneira', quantidade: 1 }]);
    expect(seg.anotacoes).toEqual(['Alvenaria do bloco B', 'Limpeza']);
    expect(seg.fotos.map((f) => f.id)).toEqual(['f1']);
    expect(d.dias.find((x) => x.data === '2026-11-03')).toMatchObject({ status: 'sem-expediente', motivo: 'Chuva' });
    expect(d.dias.find((x) => x.data === '2026-11-04')!.status).toBe('sem-registro');
  });

  it('ignora registros e fotos de outras obras e de outras semanas', () => {
    const d = montarDiarioSemanal(ubs, '2026-11-05', registros, fotos);
    expect(d.dias.flatMap((x) => x.fotos)).toHaveLength(1);
    expect(d.dias.filter((x) => x.status === 'registrado')).toHaveLength(1);
  });

  it('recusa obra de diário diário', () => {
    expect(() => montarDiarioSemanal(cbtu, '2026-11-05', [], [])).toThrow('Obra sem diário semanal');
  });
});

describe('diarioSemanalHtml', () => {
  const d = montarDiarioSemanal(ubs, '2026-11-05', registros, fotos);
  const html = diarioSemanalHtml(d, (f) => `data:${f.id}`);

  it('traz cabeçalho, período e anotações', () => {
    expect(html).toContain(ubs.nome);
    expect(html).toContain('SEMOV');
    expect(html).toContain('31/10/2026');
    expect(html).toContain('06/11/2026');
    expect(html).toContain('Alvenaria do bloco B');
    expect(html).toContain('Sem expediente: Chuva');
  });

  it('inclui as fotos com a fonte resolvida e a data', () => {
    expect(html).toContain('src="data:f1"');
    expect(html).toContain('02/11/2026');
  });

  it('escapa HTML das anotações', () => {
    const r = criarRegistroDiario({ obraId: 'ubs', data: '2026-11-02', anotacoes: ['<b>x</b> & y'] });
    const h = diarioSemanalHtml(montarDiarioSemanal(ubs, '2026-11-05', [r], []), () => '');
    expect(h).toContain('&lt;b&gt;x&lt;/b&gt; &amp; y');
    expect(h).not.toContain('<b>x</b>');
  });
});
