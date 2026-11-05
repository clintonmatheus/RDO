import { adicionarDias, diaDaSemana, formatarDataBR, periodoSemanal } from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import {
  EQUIPAMENTOS, FUNCOES, totalEfetivo, type Equipamento, type Funcao, type RegistroDiario, type Ritmo,
} from '../domain/registro';

export interface DiaDoDiario {
  data: string;
  diaSemana: string;
  status: 'registrado' | 'sem-expediente' | 'sem-registro';
  motivo?: string;
  efetivoTotal: number;
  efetivo: { funcao: Funcao; quantidade: number }[];
  equipamentos: { equipamento: Equipamento; quantidade: number }[];
  ritmo?: Ritmo;
  anotacoes: string[];
  fotos: Foto[];
}

export interface DiarioSemanal {
  obra: Obra;
  periodo: { inicio: string; fim: string };
  dias: DiaDoDiario[];
}

export function montarDiarioSemanal(obra: Obra, dataNaSemana: string, registros: RegistroDiario[], fotos: Foto[]): DiarioSemanal {
  if (obra.tipoDiario !== 'semanal' || !obra.inicioSemana) throw new Error('Obra sem diário semanal');
  const periodo = periodoSemanal(dataNaSemana, obra.inicioSemana);
  const dias: DiaDoDiario[] = [];
  for (let d = periodo.inicio; d <= periodo.fim; d = adicionarDias(d, 1)) {
    const r = registros.find((x) => x.obraId === obra.id && x.data === d);
    const base = {
      data: d,
      diaSemana: diaDaSemana(d),
      fotos: fotos.filter((f) => f.obraId === obra.id && f.data === d).sort((a, b) => a.capturadaEm.localeCompare(b.capturadaEm)),
    };
    if (!r) {
      dias.push({ ...base, status: 'sem-registro', efetivoTotal: 0, efetivo: [], equipamentos: [], anotacoes: [] });
    } else {
      dias.push({
        ...base,
        status: r.semExpediente ? 'sem-expediente' : 'registrado',
        motivo: r.semExpediente?.motivo,
        efetivoTotal: totalEfetivo(r),
        efetivo: FUNCOES.filter((f) => r.efetivo[f] > 0).map((funcao) => ({ funcao, quantidade: r.efetivo[funcao] })),
        equipamentos: EQUIPAMENTOS.filter((e) => r.equipamentos[e] > 0).map((equipamento) => ({ equipamento, quantidade: r.equipamentos[equipamento] })),
        ritmo: r.ritmo,
        anotacoes: r.anotacoes,
      });
    }
  }
  return { obra, periodo, dias };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function diarioSemanalHtml(diario: DiarioSemanal, srcDaFoto: (f: Foto) => string): string {
  const { obra, periodo, dias } = diario;
  const blocos = dias.map((d) => {
    const titulo = `<h3>${esc(d.diaSemana)} · ${formatarDataBR(d.data)}</h3>`;
    if (d.status === 'sem-registro') return `<section>${titulo}<p class="suave">Sem registro.</p>${fotosHtml(d)}</section>`;
    if (d.status === 'sem-expediente') return `<section>${titulo}<p>Sem expediente: ${esc(d.motivo ?? '')}</p>${fotosHtml(d)}</section>`;
    const efetivo = d.efetivo.map((e) => `${esc(e.funcao)}: ${e.quantidade}`).join(' · ');
    const equip = d.equipamentos.map((e) => `${esc(e.equipamento)}: ${e.quantidade}`).join(' · ');
    return `<section>${titulo}
<p><b>Efetivo (${d.efetivoTotal}):</b> ${efetivo || '—'}</p>
${equip ? `<p><b>Equipamentos:</b> ${equip}</p>` : ''}
<p><b>Ritmo:</b> ${esc(d.ritmo ?? '')}</p>
<ul>${d.anotacoes.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>${fotosHtml(d)}</section>`;
  });

  function fotosHtml(d: DiaDoDiario): string {
    if (!d.fotos.length) return '';
    return `<div class="fotos">${d.fotos
      .map((f) => `<figure><img src="${esc(srcDaFoto(f))}"/><figcaption>${formatarDataBR(f.data)}</figcaption></figure>`)
      .join('')}</div>`;
  }

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><style>
body{font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#111;margin:24px}
h1{font-size:18px;margin:0}h3{font-size:13px;margin:12px 0 4px;text-transform:capitalize}
section{border-top:1px solid #bbb;padding-bottom:6px;page-break-inside:avoid}
.suave{color:#666}.fotos{display:flex;flex-wrap:wrap;gap:6px}
figure{margin:0}img{width:150px;height:110px;object-fit:cover}figcaption{font-size:10px;color:#555}
</style></head><body>
<h1>Diário de Ocorrências — semana ${formatarDataBR(periodo.inicio)} a ${formatarDataBR(periodo.fim)}</h1>
<p><b>${esc(obra.nome)}</b><br/>${esc(obra.orgao)} · Contrato ${esc(obra.contrato)} · ${esc(obra.local)}</p>
${blocos.join('\n')}
</body></html>`;
}
