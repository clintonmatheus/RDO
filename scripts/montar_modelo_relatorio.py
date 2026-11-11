"""Gera o modelo enxuto do relatório fotográfico a partir de um PPTX real da empresa.

Uso: python3 scripts/montar_modelo_relatorio.py ORIGEM.pptx assets/relatorio/modelo-aln.pptx
Mantém capa e cabeçalho (logomarca) do original; a página de fotos vira o arquivo rdo/pagina-fotos.xml,
que o app clona (4 fotos por página). Remove fontes embutidas, notas e fotos do original.
"""
import re, sys, zipfile

orig, destino = sys.argv[1], sys.argv[2]
z = zipfile.ZipFile(orig)
ler = lambda n: z.read(n).decode('utf-8')

def sem_tipo_fonte(s):
    return s.replace('Calibri (MS)', 'Calibri').replace('TT Rounds Condensed', 'Arial')

# Capa
capa = sem_tipo_fonte(ler('ppt/slides/slide1.xml'))
textos = re.findall(r'<a:t>([^<]*)</a:t>', capa)
assert len(textos) == 4, textos
for t, marca in zip(textos, ['{{TITULO1}}', '{{TITULO2}}', '{{TITULO3}}', '{{OBJETO}}']):
    capa = capa.replace(f'<a:t>{t}</a:t>', f'<a:t>{marca}</a:t>', 1)
capa_rels = re.sub(r'<Relationship [^>]*notesSlide[^>]*/>', '', ler('ppt/slides/_rels/slide1.xml.rels'))

# Página de fotos (modelo)
pag = sem_tipo_fonte(ler('ppt/slides/slide2.xml'))
pag = re.sub(r'<p:extLst>.*?</p:extLst></p:sld>', '</p:sld>', pag, flags=re.S)
rels2 = ler('ppt/slides/_rels/slide2.xml.rels')
alvo = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="\.\./media/(image\d+\.jpeg)"', rels2))
assert alvo['rId3'] == 'image1.jpeg'
fotos = re.findall(r'<p:pic>.*?</p:pic>', pag, flags=re.S)
assert len(fotos) == 4
def pos(xml):
    m = re.search(r'<a:off x="(\d+)" y="(\d+)"/>', xml); return (int(m.group(2)) // 300000, int(m.group(1)))
for i, f in enumerate(sorted(fotos, key=pos), start=1):
    novo = re.sub(r'name="[^"]*"', f'name="FOTO{i}"', f, count=1)
    novo = re.sub(r'r:embed="rId\d+"', f'r:embed="rIdFoto{i}"', novo)
    novo = novo.replace('<a:stretch><a:fillRect/></a:stretch>', f'{{{{CORTE{i}}}}}<a:stretch><a:fillRect/></a:stretch>')
    pag = pag.replace(f, novo)
legendas = re.findall(r'<p:sp>(?:(?!</p:sp>).)*?<a:t>\d{2}/\d{2}/\d{4}</a:t>(?:(?!</p:sp>).)*</p:sp>', pag, flags=re.S)
assert len(legendas) == 4, len(legendas)
for i, l in enumerate(sorted(legendas, key=pos), start=1):
    novo = re.sub(r'name="[^"]*"', f'name="DATA{i}"', l, count=1)
    novo = re.sub(r'<a:t>\d{2}/\d{2}/\d{4}</a:t>', f'<a:t>{{{{DATA{i}}}}}</a:t>', novo)
    pag = pag.replace(l, novo)

# Apresentação: só a capa; sem notas, fontes embutidas e revisões
pres = ler('ppt/presentation.xml')
pres = re.sub(r'<p:notesMasterIdLst>.*?</p:notesMasterIdLst>', '', pres)
pres = re.sub(r'<p:embeddedFontLst>.*?</p:embeddedFontLst>', '', pres)
pres = pres.replace(' embedTrueTypeFonts="1"', '').replace(' saveSubsetFonts="1"', '')
pres = re.sub(r'<p:sldIdLst>.*?</p:sldIdLst>', '<p:sldIdLst><p:sldId id="256" r:id="rIdCapa"/></p:sldIdLst>', pres)
pres = re.sub(r'<p:extLst>.*?</p:extLst>(?=</p:presentation>)', '', pres, flags=re.S)

manter_tipos = ('slideMaster', 'theme', 'presProps', 'viewProps', 'tableStyles')
rels = [r for r in re.findall(r'<Relationship [^>]*/>', ler('ppt/_rels/presentation.xml.rels'))
        if any(f'relationships/{t}"' in r for t in manter_tipos) and 'theme2' not in r]
rels.append('<Relationship Id="rIdCapa" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>')
pres_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
             '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(rels) + '</Relationships>')

tipos = ler('[Content_Types].xml')
for parte in ['slides/slide2', 'slides/slide3', 'slides/slide4', 'notesMasters/', 'notesSlides/', 'changesInfos/', 'revisionInfo', 'theme/theme2']:
    tipos = re.sub(r'<Override PartName="/ppt/' + re.escape(parte) + r'[^"]*"[^>]*/>', '', tipos)
tipos = re.sub(r'<Default Extension="fntdata"[^>]*/>', '', tipos)

raiz_rels = re.sub(r'<Relationship [^>]*thumbnail[^>]*/>', '', ler('_rels/.rels'))
app = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
       '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
       '<Application>Microsoft Office PowerPoint</Application><PresentationFormat>Personalizar</PresentationFormat></Properties>')

copiar = [n for n in z.namelist() if n.startswith(('ppt/slideLayouts/', 'ppt/slideMasters/', 'ppt/theme/theme1'))] + \
         ['ppt/presProps.xml', 'ppt/viewProps.xml', 'ppt/tableStyles.xml', 'docProps/core.xml', 'ppt/media/image1.jpeg']
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as out:
    out.writestr('[Content_Types].xml', tipos)
    out.writestr('_rels/.rels', raiz_rels)
    out.writestr('docProps/app.xml', app)
    out.writestr('ppt/presentation.xml', pres)
    out.writestr('ppt/_rels/presentation.xml.rels', pres_rels)
    out.writestr('ppt/slides/slide1.xml', capa)
    out.writestr('ppt/slides/_rels/slide1.xml.rels', capa_rels)
    out.writestr('rdo/pagina-fotos.xml', pag)
    for n in copiar:
        out.writestr(n, z.read(n))
print('ok', destino)
