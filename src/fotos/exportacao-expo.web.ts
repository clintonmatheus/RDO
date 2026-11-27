import type { Periodo } from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import { lerBytes } from './arquivos.web';
import { gerarZipDeFotos, nomeDoZip, planejarExportacao } from './exportacao';

/** Monta o ZIP e entrega: folha de compartilhar do aparelho (quando aceita arquivos) ou download. */
export async function exportarFotosZip(args: { obra: Obra; periodo: Periodo; fotos: Foto[] }) {
  const plano = planejarExportacao(args.fotos);
  const arquivos = [];
  for (const e of plano) arquivos.push({ caminho: e.caminho, bytes: await lerBytes(e.foto.uri) });
  const bytes = await gerarZipDeFotos(arquivos);
  const nome = nomeDoZip(args.obra.id, args.periodo);
  const arquivo = new File([bytes as BlobPart], nome, { type: 'application/zip' });
  const nav = navigator as Navigator & { canShare?: (d: object) => boolean };
  if (nav.canShare?.({ files: [arquivo] })) {
    try { await nav.share({ files: [arquivo], title: 'Fotos da obra' }); return; } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
