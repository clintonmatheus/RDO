import { formatarDataBR, periodoDoMes } from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import { FUNCOES, type RegistroDiario } from '../domain/registro';
import { esc, montarDias, type DiarioSemanal } from './semanal';

/** Diário de período contínuo (mês) da obra do CBTU. */
export type DiarioMensal = DiarioSemanal;

export function montarDiarioMensal(obra: Obra, dataNoMes: string, registros: RegistroDiario[], fotos: Foto[]): DiarioMensal {
  if (!obra.controlaEfetivo) throw new Error('Obra sem diário diário');
  const periodo = periodoDoMes(dataNoMes);
  return { obra, periodo, dias: montarDias(obra, periodo, registros, fotos) };
}

export function diarioCbtuHtml(diario: DiarioMensal, srcDaFoto: (f: Foto) => string): string {
  const { obra, periodo, dias } = diario;
  const colunas = FUNCOES.map((f) => `<th>${esc(f)}</th>`).join('');
  const linhas = dias.map((d) => {
    const dia = `${formatarDataBR(d.data)}<br/><span class="suave">${esc(d.diaSemana)}</span>`;
    if (d.status !== 'registrado') {
      const texto = d.status === 'sem-expediente' ? `Sem expediente: ${esc(d.motivo ?? '')}` : 'Sem registro';
      return `<tr class="vazio"><td>${dia}</td><td colspan="${FUNCOES.length + 3}" class="suave">${texto}</td></tr>`;
    }
    const qtd = FUNCOES.map((f) => `<td class="n">${d.efetivo.find((e) => e.funcao === f)?.quantidade ?? ''}</td>`).join('');
    const equip = d.equipamentos.map((e) => `${esc(e.equipamento)}: ${e.quantidade}`).join(' · ');
    const notas = d.anotacoes.map((a) => esc(a)).join('<br/>');
    return `<tr><td>${dia}</td>${qtd}<td class="n">${d.efetivoTotal}</td><td>${esc(d.ritmo ?? '')}</td><td>${notas}${equip ? `<br/><i>${equip}</i>` : ''}</td></tr>`;
  });

  const comFotos = dias.filter((d) => d.fotos.length > 0);
  const galeria = comFotos.length
    ? `<h2>Registro fotográfico</h2>${comFotos
        .map((d) => `<h3>${formatarDataBR(d.data)}</h3><div class="fotos">${d.fotos
          .map((f) => `<figure><img src="${esc(srcDaFoto(f))}"/></figure>`).join('')}</div>`)
        .join('')}`
    : '';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><style>
body{font-family:Helvetica,Arial,sans-serif;font-size:10px;color:#111;margin:20px}
h1{font-size:16px;margin:0}h2{font-size:13px;margin:16px 0 4px}h3{font-size:11px;margin:8px 0 2px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:3px;vertical-align:top}
th{background:#eee;font-size:9px}td.n{text-align:center}.suave{color:#666}tr{page-break-inside:avoid}
.fotos{display:flex;flex-wrap:wrap;gap:6px}figure{margin:0}img{width:150px;height:110px;object-fit:cover}
</style></head><body>
<h1>Diário de Obra — ${formatarDataBR(periodo.inicio)} a ${formatarDataBR(periodo.fim)}</h1>
<p><b>${esc(obra.nome)}</b><br/>${esc(obra.orgao)} · Contrato ${esc(obra.contrato)}${obra.art ? ` · ART ${esc(obra.art)}` : ''} · ${esc(obra.local)}</p>
<table><thead><tr><th>Data</th>${colunas}<th>Total</th><th>Ritmo</th><th>Ocorrências / equipamentos</th></tr></thead>
<tbody>${linhas.join('\n')}</tbody></table>
${galeria}
</body></html>`;
}
