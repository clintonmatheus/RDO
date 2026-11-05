import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import type { Foto } from '../domain/foto';
import { diarioSemanalHtml, type DiarioSemanal } from './semanal';

/** Gera o PDF do diário semanal (fotos embutidas em base64) e abre a folha de compartilhamento. */
export async function gerarPdfSemanal(diario: DiarioSemanal): Promise<void> {
  const fontes = new Map<string, string>();
  for (const d of diario.dias) {
    for (const f of d.fotos) {
      fontes.set(f.id, `data:image/jpeg;base64,${await new File(f.uri).base64()}`);
    }
  }
  const html = diarioSemanalHtml(diario, (f: Foto) => fontes.get(f.id) ?? '');
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
