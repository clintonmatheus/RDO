import { formatarDataBR, type Periodo } from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import type { CapaRelatorio } from './pptx';

export function capaDoRelatorio(obra: Obra, numeroMedicao: string): CapaRelatorio {
  const n = numeroMedicao.trim();
  return {
    titulo1: n ? `RELATÓRIO FOTOGRÁFICO MEDIÇÃO Nº ${n.padStart(2, '0')}` : 'RELATÓRIO FOTOGRÁFICO',
    titulo2: obra.relatorio.licitacao,
    titulo3: obra.relatorio.processo,
    objeto: obra.relatorio.objeto,
  };
}

/** Fotos visíveis do período, em ordem de data e hora. */
export function fotosDoPeriodo(fotos: Foto[], periodo: Periodo): Foto[] {
  return fotos
    .filter((f) => !f.excluida && !!f.uri && f.data >= periodo.inicio && f.data <= periodo.fim)
    .sort((a, b) => a.data.localeCompare(b.data) || a.capturadaEm.localeCompare(b.capturadaEm));
}

export function legendasDoRelatorio(fotos: Foto[]): string[] {
  return fotos.map((f) => formatarDataBR(f.data));
}
