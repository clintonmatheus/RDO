/** Navegador: a foto é guardada como data URL (data:image/jpeg;base64,...). */
export async function lerBytes(uri: string): Promise<Uint8Array> {
  const r = await fetch(uri);
  return new Uint8Array(await r.arrayBuffer());
}

export function blobParaDataUrl(b: Blob): Promise<string> {
  return new Promise((ok, erro) => {
    const l = new FileReader();
    l.onload = () => ok(String(l.result));
    l.onerror = () => erro(l.error);
    l.readAsDataURL(b);
  });
}

export async function baixarFoto(url: string, _id: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Falha ao baixar a foto');
  return blobParaDataUrl(await r.blob());
}
