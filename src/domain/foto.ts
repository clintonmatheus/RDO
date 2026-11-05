import { dataLocal, diaDaSemana } from './datas';

export type OrigemFoto = 'camera' | 'galeria';

export interface Foto {
  id: string;
  obraId: string;
  uri: string;
  origem: OrigemFoto;
  /** Instante da captura (ISO UTC). Na galeria, é a data original do arquivo quando existir. */
  capturadaEm: string;
  /** Dia local (Natal/RN) ao qual a foto pertence. */
  data: string;
  /** Verdadeiro só para fotos tiradas pela câmera do app. */
  dataConfiavel: boolean;
  descricao?: string;
}

export interface NovaFoto {
  id: string;
  obraId: string;
  uri: string;
  origem: OrigemFoto;
  capturadaEm: string;
  /** Galeria: data original do arquivo (EXIF), se houver. */
  dataOriginal?: string;
  /** Galeria: dia escolhido manualmente pelo usuário (AAAA-MM-DD). */
  dataManual?: string;
  descricao?: string;
}

export function criarFoto(n: NovaFoto): Foto {
  const base = { id: n.id, obraId: n.obraId, uri: n.uri, origem: n.origem, descricao: n.descricao };
  if (n.origem === 'camera') {
    return { ...base, capturadaEm: n.capturadaEm, data: dataLocal(n.capturadaEm), dataConfiavel: true };
  }
  const capturadaEm = n.dataOriginal ?? n.capturadaEm;
  let data = dataLocal(capturadaEm);
  if (n.dataManual !== undefined) {
    diaDaSemana(n.dataManual); // valida
    data = n.dataManual;
  }
  return { ...base, capturadaEm, data, dataConfiavel: false };
}

export function agruparFotosPorDia(fotos: Foto[]): Record<string, Foto[]> {
  const grupos: Record<string, Foto[]> = {};
  for (const f of [...fotos].sort((a, b) => Date.parse(a.capturadaEm) - Date.parse(b.capturadaEm))) {
    (grupos[`${f.obraId}|${f.data}`] ??= []).push(f);
  }
  return grupos;
}
