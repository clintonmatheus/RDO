/**
 * Confere o formato mínimo de um item baixado do servidor antes de guardá-lo no aparelho. O servidor aceita qualquer
 * JSON no conteúdo: sem esta conferência, um item malformado gravado por outra pessoa travava a sincronização ou a
 * tela do dia. Item reprovado é ignorado; os demais seguem.
 */
const texto = (v: unknown): v is string => typeof v === 'string';
const dia = (v: unknown) => texto(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** Id seguro: o id da foto vira nome de arquivo no celular, então só letras, números, "-" e "_". */
export const idSeguro = (v: unknown): v is string => texto(v) && /^[A-Za-z0-9_-]{1,100}$/.test(v);

export function registroValido(x: unknown): boolean {
  return objeto(x) && texto(x.obraId) && dia(x.data) && objeto(x.efetivo) && objeto(x.equipamentos);
}

export function anotacaoValida(x: unknown): boolean {
  return objeto(x) && idSeguro(x.id) && texto(x.obraId) && dia(x.data) && texto(x.texto) && texto(x.autorId)
    && texto(x.autorNome) && texto(x.criadaEm);
}

export function fotoValida(x: unknown): boolean {
  return objeto(x) && idSeguro(x.id) && texto(x.obraId) && dia(x.data) && texto(x.capturadaEm)
    && (x.caminhoRemoto === undefined || texto(x.caminhoRemoto));
}
