import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { dataExif } from './exif';
import { novoId } from './id';
import type { FotoCapturada, ServicoFotos } from './servico';

/** Copia a imagem para a pasta de documentos do app, para não depender do cache/galeria. */
function guardar(uriOrigem: string): string {
  const pasta = new Directory(Paths.document, 'fotos');
  if (!pasta.exists) pasta.create();
  const destino = new File(pasta, `${novoId()}.jpg`);
  new File(uriOrigem).copy(destino);
  return destino.uri;
}

async function resultado(r: ImagePicker.ImagePickerResult, galeria: boolean): Promise<FotoCapturada | undefined> {
  if (r.canceled || !r.assets[0]) return undefined;
  const a = r.assets[0];
  const agora = new Date().toISOString();
  return { uri: guardar(a.uri), capturadaEm: (galeria ? dataExif(a.exif) : undefined) ?? agora };
}

/** Implementação real (câmera/galeria do aparelho); não coberta por testes automatizados. */
export const servicoFotosDoApp: ServicoFotos = {
  async tirarFoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return undefined;
    return resultado(await ImagePicker.launchCameraAsync({ quality: 0.7 }), false);
  },
  async escolherDaGaleria() {
    return resultado(
      await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, exif: true }),
      true,
    );
  },
};
