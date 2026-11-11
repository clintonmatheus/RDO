import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Periodo } from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import { MODELO_ALN_BASE64 } from './modeloAln';
import { base64ParaBytes, gerarRelatorioPptx, type FotoRelatorio } from './pptx';
import { capaDoRelatorio, legendasDoRelatorio } from './relatorio';

const LADO_MAXIMO = 1200;
const TIPO_PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** Reduz a foto (e aplica a rotação do EXIF) para o relatório não ficar pesado. */
async function prepararFoto(f: Foto): Promise<{ bytes: Uint8Array; largura: number; altura: number }> {
  const original = await ImageManipulator.manipulate(f.uri).renderAsync();
  const deitada = original.width >= original.height;
  const imagem = (original.width > LADO_MAXIMO || original.height > LADO_MAXIMO)
    ? await ImageManipulator.manipulate(f.uri).resize(deitada ? { width: LADO_MAXIMO } : { height: LADO_MAXIMO }).renderAsync()
    : original;
  const salvo = await imagem.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  const bytes = await new File(salvo.uri).bytes();
  return { bytes, largura: salvo.width, altura: salvo.height };
}

/** Gera o relatório fotográfico (.pptx) e abre a folha de compartilhamento. */
export async function gerarRelatorioFotografico(args: { obra: Obra; periodo: Periodo; numeroMedicao: string; fotos: Foto[] }) {
  const legendas = legendasDoRelatorio(args.fotos);
  const itens: FotoRelatorio[] = [];
  for (let i = 0; i < args.fotos.length; i++) {
    itens.push({ ...(await prepararFoto(args.fotos[i])), legenda: legendas[i] });
  }
  const bytes = await gerarRelatorioPptx(base64ParaBytes(MODELO_ALN_BASE64), capaDoRelatorio(args.obra, args.numeroMedicao), itens);
  const nome = `Relatorio_Fotografico_${args.obra.id}_${args.periodo.inicio}_a_${args.periodo.fim}.pptx`;
  const arquivo = new File(Paths.cache, nome);
  if (arquivo.exists) arquivo.delete();
  arquivo.create();
  await arquivo.write(bytes);
  await Sharing.shareAsync(arquivo.uri, { mimeType: TIPO_PPTX, UTI: 'org.openxmlformats.presentationml.presentation', dialogTitle: 'Relatório fotográfico' });
}
