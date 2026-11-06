import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import type { Foto } from '../domain/foto';
import { diarioCbtuHtml } from './cbtu';
import { diarioSemanalHtml, type DiarioSemanal } from './semanal';

/** Gera o PDF do diário semanal (fotos embutidas em base64) e abre a folha de compartilhamento. */
export async function gerarPdfSemanal(diario: DiarioSemanal): Promise<void> {
  const fontes = new Map<string, string>();
  for (const d of diario.dias) {
    for (const f of d.fotos) {
      fontes.set(f.id, `data:image/jpeg;base64,${await new File(f.uri).base64()}`);
    }
  }
  const src = (f: Foto) => fontes.get(f.id) ?? '';
  const mensal = diario.obra.controlaEfetivo;
  // CBTU: tabela larga, página A4 em paisagem; SEINFRA: A4 em retrato.
  const { uri } = await Print.printToFileAsync(
    mensal
      ? { html: diarioCbtuHtml(diario, src), width: 842, height: 595 }
      : { html: diarioSemanalHtml(diario, src), width: 595, height: 842 },
  );
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
