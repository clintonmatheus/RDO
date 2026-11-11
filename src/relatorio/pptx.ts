import JSZip from 'jszip';

export interface FotoRelatorio {
  /** JPEG já com a orientação correta (o app reduz e gira antes). */
  bytes: Uint8Array;
  largura: number;
  altura: number;
  /** Texto abaixo da foto (data dd/mm/aaaa). */
  legenda: string;
}

export interface CapaRelatorio { titulo1: string; titulo2: string; titulo3: string; objeto: string }

const FOTOS_POR_PAGINA = 4;
const MODELO_PAGINA = 'rdo/pagina-fotos.xml';
const TIPO_SLIDE = 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 → bytes, sem depender de atob/Buffer (funciona no app e nos testes). */
export function base64ParaBytes(b64: string): Uint8Array {
  const limpo = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const saida = new Uint8Array(Math.floor((limpo.length * 3) / 4));
  let buf = 0, bits = 0, j = 0;
  for (let i = 0; i < limpo.length; i++) {
    buf = (buf << 6) | ALFABETO.indexOf(limpo[i]);
    bits += 6;
    if (bits >= 8) { bits -= 8; saida[j++] = (buf >> bits) & 0xff; }
  }
  return saida.subarray(0, j);
}

/** Recorte central para caber no quadro quadrado do modelo (unidades de 1/1000 %). */
export function corteQuadrado(largura: number, altura: number): string {
  if (largura === altura) return '';
  if (largura > altura) {
    const lado = Math.round(((largura - altura) / 2 / largura) * 100000);
    return `<a:srcRect l="${lado}" r="${lado}"/>`;
  }
  const lado = Math.round(((altura - largura) / 2 / altura) * 100000);
  return `<a:srcRect t="${lado}" b="${lado}"/>`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function removerElemento(xml: string, tag: 'p:pic' | 'p:sp', nome: string): string {
  const re = new RegExp(`<${tag}>(?:(?!</${tag}>)[\\s\\S])*?name="${nome}"[\\s\\S]*?</${tag}>`);
  return xml.replace(re, '');
}

/** Gera o relatório fotográfico (capa + páginas com 4 fotos e data) a partir do modelo da empresa. */
export async function gerarRelatorioPptx(modelo: Uint8Array, capa: CapaRelatorio, fotos: FotoRelatorio[]): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(modelo);
  const ler = (n: string) => zip.file(n)!.async('string');

  // Capa
  let capaXml = await ler('ppt/slides/slide1.xml');
  for (const [marca, valor] of Object.entries({
    TITULO1: capa.titulo1, TITULO2: capa.titulo2, TITULO3: capa.titulo3, OBJETO: capa.objeto,
  })) capaXml = capaXml.replace(`{{${marca}}}`, esc(valor));
  zip.file('ppt/slides/slide1.xml', capaXml);

  const modeloPagina = await ler(MODELO_PAGINA);
  zip.remove(MODELO_PAGINA);
  let pres = await ler('ppt/presentation.xml');
  let presRels = await ler('ppt/_rels/presentation.xml.rels');
  let tipos = await ler('[Content_Types].xml');
  const sldIds: string[] = [];

  for (let p = 0; p * FOTOS_POR_PAGINA < fotos.length; p++) {
    const numSlide = p + 2;
    const grupo = fotos.slice(p * FOTOS_POR_PAGINA, (p + 1) * FOTOS_POR_PAGINA);
    let xml = modeloPagina;
    const rels = [
      `<Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout7.xml"/>`,
      `<Relationship Id="rId3" Type="${REL}/image" Target="../media/image1.jpeg"/>`,
    ];
    for (let i = 1; i <= FOTOS_POR_PAGINA; i++) {
      const f = grupo[i - 1];
      if (!f) {
        xml = removerElemento(xml, 'p:pic', `FOTO${i}`);
        xml = removerElemento(xml, 'p:sp', `DATA${i}`);
        continue;
      }
      const indice = p * FOTOS_POR_PAGINA + i;
      const midia = `rdo_foto_${indice}.jpeg`;
      zip.file(`ppt/media/${midia}`, f.bytes);
      rels.push(`<Relationship Id="rIdFoto${i}" Type="${REL}/image" Target="../media/${midia}"/>`);
      xml = xml.replace(`{{CORTE${i}}}`, corteQuadrado(f.largura, f.altura)).replace(`{{DATA${i}}}`, esc(f.legenda));
    }
    zip.file(`ppt/slides/slide${numSlide}.xml`, xml);
    zip.file(`ppt/slides/_rels/slide${numSlide}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
    presRels = presRels.replace('</Relationships>',
      `<Relationship Id="rIdPag${numSlide}" Type="${REL}/slide" Target="slides/slide${numSlide}.xml"/></Relationships>`);
    tipos = tipos.replace('</Types>', `<Override PartName="/ppt/slides/slide${numSlide}.xml" ContentType="${TIPO_SLIDE}"/></Types>`);
    sldIds.push(`<p:sldId id="${256 + numSlide}" r:id="rIdPag${numSlide}"/>`);
  }

  pres = pres.replace('</p:sldIdLst>', `${sldIds.join('')}</p:sldIdLst>`);
  zip.file('ppt/presentation.xml', pres);
  zip.file('ppt/_rels/presentation.xml.rels', presRels);
  zip.file('[Content_Types].xml', tipos);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
