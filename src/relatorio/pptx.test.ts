import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { base64ParaBytes, corteQuadrado, gerarRelatorioPptx, type FotoRelatorio } from './pptx';
import { MODELO_ALN_BASE64 } from './modeloAln';

const modelo = base64ParaBytes(MODELO_ALN_BASE64);
const paisagem = new Uint8Array(readFileSync(`${__dirname}/__fixtures__/paisagem.jpg`));
const retrato = new Uint8Array(readFileSync(`${__dirname}/__fixtures__/retrato.jpg`));
const capa = { titulo1: 'RELATÓRIO FOTOGRÁFICO MEDIÇÃO Nº 10', titulo2: 'CONCORRÊNCIA ELETRÔNICA Nº 22.003/2025', titulo3: 'PROCESSO N° 1-SEINFRA', objeto: 'OBRA <A> & B' };
const foto = (dia: number, f = paisagem, l = 400, a = 300): FotoRelatorio => ({ bytes: f, largura: l, altura: a, legenda: `0${dia}/11/2026` });

async function abrir(bytes: Uint8Array) { return JSZip.loadAsync(bytes); }
const texto = async (z: JSZip, n: string) => (await z.file(n)!.async('string'));

describe('base64ParaBytes', () => {
  it('decodifica igual ao Buffer', () => {
    const b = Buffer.from('Relatório ✓ 123', 'utf8');
    expect(Buffer.from(base64ParaBytes(b.toString('base64')))).toEqual(b);
    expect(base64ParaBytes('').length).toBe(0);
  });
});

describe('corteQuadrado', () => {
  it('corta as laterais da foto deitada e o alto/baixo da foto em pé, centralizando', () => {
    expect(corteQuadrado(400, 300)).toBe('<a:srcRect l="12500" r="12500"/>');
    expect(corteQuadrado(300, 600)).toBe('<a:srcRect t="25000" b="25000"/>');
    expect(corteQuadrado(500, 500)).toBe('');
  });
});

describe('gerarRelatorioPptx', () => {
  it('capa + uma página a cada 4 fotos, com data como legenda', async () => {
    const fotos = [1, 2, 3, 4, 5, 6].map((d) => foto(d));
    const z = await abrir(await gerarRelatorioPptx(modelo, capa, fotos));
    const pres = await texto(z, 'ppt/presentation.xml');
    expect(pres.match(/<p:sldId /g)).toHaveLength(3);
    const capaXml = await texto(z, 'ppt/slides/slide1.xml');
    expect(capaXml).toContain('RELATÓRIO FOTOGRÁFICO MEDIÇÃO Nº 10');
    expect(capaXml).toContain('OBRA &lt;A&gt; &amp; B');
    expect(capaXml).not.toContain('{{');
    const p1 = await texto(z, 'ppt/slides/slide2.xml');
    for (const d of ['01/11/2026', '02/11/2026', '03/11/2026', '04/11/2026']) expect(p1).toContain(d);
    expect(p1).not.toContain('{{');
    const p2 = await texto(z, 'ppt/slides/slide3.xml');
    expect(p2).toContain('06/11/2026');
    expect(p2.match(/<p:pic>/g)).toHaveLength(2);
    expect(p2).not.toContain('name="FOTO3"');
    expect(p2).not.toContain('name="DATA3"');
  });

  it('inclui as imagens, relações e tipos de conteúdo de cada página', async () => {
    const z = await abrir(await gerarRelatorioPptx(modelo, capa, [foto(1), foto(2, retrato, 300, 500)]));
    expect(z.file('ppt/media/rdo_foto_1.jpeg')).toBeTruthy();
    expect(z.file('ppt/media/rdo_foto_2.jpeg')).toBeTruthy();
    const rels = await texto(z, 'ppt/slides/_rels/slide2.xml.rels');
    expect(rels).toContain('Id="rIdFoto1"');
    expect(rels).toContain('Target="../media/rdo_foto_2.jpeg"');
    expect(rels).toContain('Target="../media/image1.jpeg"');
    expect(await texto(z, '[Content_Types].xml')).toContain('/ppt/slides/slide2.xml');
    expect(await texto(z, 'ppt/_rels/presentation.xml.rels')).toContain('Target="slides/slide2.xml"');
    const pag = await texto(z, 'ppt/slides/slide2.xml');
    expect(pag).toContain('<a:srcRect l="12500" r="12500"/>');
    expect(pag).toContain('<a:srcRect t="20000" b="20000"/>');
    expect(z.file('rdo/pagina-fotos.xml')).toBeNull();
  });

  it('sem fotos gera só a capa', async () => {
    const z = await abrir(await gerarRelatorioPptx(modelo, capa, []));
    expect((await texto(z, 'ppt/presentation.xml')).match(/<p:sldId /g)).toHaveLength(1);
  });
});
