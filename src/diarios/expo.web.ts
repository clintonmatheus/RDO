import type { Foto } from '../domain/foto';
import { diarioCbtuHtml } from './cbtu';
import { diarioSemanalHtml, type DiarioSemanal } from './semanal';

/** Navegador: abre o diário numa janela e chama a impressão; o usuário escolhe "Salvar como PDF" / compartilhar. */
export async function gerarPdfSemanal(diario: DiarioSemanal): Promise<void> {
  // A janela precisa abrir antes de qualquer espera, senão o navegador bloqueia.
  const janela = window.open('', '_blank');
  if (!janela) throw new Error('Permita janelas deste site para gerar o PDF');
  const src = (f: Foto) => f.uri;
  const mensal = diario.obra.controlaEfetivo;
  const pagina = `@page { size: A4 ${mensal ? 'landscape' : 'portrait'}; margin: 12mm 10mm; }`;
  let html = mensal ? diarioCbtuHtml(diario, src) : diarioSemanalHtml(diario, src);
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `<style>${pagina}</style></head>`) : `<style>${pagina}</style>${html}`;
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  const imprimir = () => { janela.focus(); janela.print(); };
  if (janela.document.readyState === 'complete') setTimeout(imprimir, 400);
  else janela.addEventListener('load', () => setTimeout(imprimir, 400));
}
