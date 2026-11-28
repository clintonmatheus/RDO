import { Directory, File, Paths } from 'expo-file-system';

/** Bytes do arquivo da foto guardada no aparelho. */
export async function lerBytes(uri: string): Promise<Uint8Array> {
  return new File(uri).bytes();
}

/** Baixa a foto de `url` para a pasta do app e devolve o endereço local. */
export async function baixarFoto(url: string, id: string): Promise<string> {
  // o id vem do servidor: sem pastas nem "..", para não apagar ou trocar arquivo fora da pasta de fotos
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('Id de foto inválido');
  const pasta = new Directory(Paths.document, 'fotos');
  if (!pasta.exists) pasta.create();
  const destino = new File(pasta, `${id}.jpg`);
  if (destino.exists) destino.delete();
  const baixado = await File.downloadFileAsync(url, destino);
  return baixado.uri;
}
