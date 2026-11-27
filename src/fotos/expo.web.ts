import * as ImagePicker from 'expo-image-picker';
import { dataExif } from './exif';
import { blobParaDataUrl } from './arquivos.web';
import type { FotoCapturada, ServicoFotos } from './servico';

const LADO_MAXIMO = 1600;

/** Reduz a foto (lado maior 1600 px, JPEG) para caber no armazenamento do navegador; devolve data URL. */
async function reduzir(uriOrigem: string): Promise<string> {
  const blob = await (await fetch(uriOrigem)).blob();
  const bmp = await createImageBitmap(blob);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const saida = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.75));
  return blobParaDataUrl(saida ?? blob);
}

async function resultado(r: ImagePicker.ImagePickerResult, galeria: boolean): Promise<FotoCapturada | undefined> {
  if (r.canceled || !r.assets[0]) return undefined;
  const a = r.assets[0];
  return { uri: await reduzir(a.uri), capturadaEm: (galeria ? dataExif(a.exif) : undefined) ?? new Date().toISOString() };
}

/** Navegador: câmera pelo seletor do aparelho (iPhone abre a câmera) e galeria. */
export const servicoFotosDoApp: ServicoFotos = {
  async tirarFoto() {
    return resultado(await ImagePicker.launchCameraAsync({ quality: 0.8 }), false);
  },
  async escolherDaGaleria() {
    return resultado(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, exif: true }), true);
  },
};
