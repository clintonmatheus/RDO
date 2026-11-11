import JSZip from 'jszip';
import type { Periodo } from '../domain/datas';
import type { Foto } from '../domain/foto';

export interface EntradaExportacao { foto: Foto; caminho: string }
export interface ArquivoZip { caminho: string; bytes: Uint8Array }

/** Fotos visíveis do período, em ordem de data e hora. */
export function fotosDoPeriodo(fotos: Foto[], periodo: Periodo): Foto[] {
  return fotos
    .filter((f) => !f.excluida && !!f.uri && f.data >= periodo.inicio && f.data <= periodo.fim)
    .sort((a, b) => a.data.localeCompare(b.data) || a.capturadaEm.localeCompare(b.capturadaEm));
}

function extensao(uri: string): string {
  const m = /\.([A-Za-z0-9]{2,5})(?:\?.*)?$/.exec(uri.split('/').pop() ?? '');
  return m ? m[1].toLowerCase() : 'jpg';
}

/** Uma pasta por data; dentro, as fotos numeradas na ordem em que foram feitas. */
export function planejarExportacao(fotos: Foto[]): EntradaExportacao[] {
  const contagem: Record<string, number> = {};
  return fotos.map((foto) => {
    const n = (contagem[foto.data] = (contagem[foto.data] ?? 0) + 1);
    const numero = String(n).padStart(2, '0');
    return { foto, caminho: `${foto.data}/${foto.data}_${numero}.${extensao(foto.uri)}` };
  });
}

export function nomeDoZip(obraId: string, periodo: Periodo): string {
  return `Fotos_${obraId}_${periodo.inicio}_a_${periodo.fim}.zip`;
}

/** Zip sem recompressão (fotos já são JPEG), preservando os bytes originais. */
export async function gerarZipDeFotos(arquivos: ArquivoZip[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const a of arquivos) zip.file(a.caminho, a.bytes);
  return zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
}
