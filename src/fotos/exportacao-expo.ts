import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Periodo } from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import { gerarZipDeFotos, nomeDoZip, planejarExportacao } from './exportacao';

/** Monta o ZIP (pastas por data, fotos no tamanho em que foram guardadas) e abre o compartilhamento. */
export async function exportarFotosZip(args: { obra: Obra; periodo: Periodo; fotos: Foto[] }) {
  const plano = planejarExportacao(args.fotos);
  const arquivos = [];
  for (const e of plano) arquivos.push({ caminho: e.caminho, bytes: await new File(e.foto.uri).bytes() });
  const bytes = await gerarZipDeFotos(arquivos);
  const arquivo = new File(Paths.cache, nomeDoZip(args.obra.id, args.periodo));
  if (arquivo.exists) arquivo.delete();
  arquivo.create();
  await arquivo.write(bytes);
  await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: 'Fotos da obra' });
}
