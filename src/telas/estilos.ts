import { StyleSheet } from 'react-native';

export const cores = { fundo: '#f4f5f7', card: '#fff', primaria: '#1f4e79', texto: '#1c1c1e', suave: '#6b7280', erro: '#b00020', borda: '#d1d5db' };

export const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 16, gap: 12 },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 14, color: cores.suave },
  card: { backgroundColor: cores.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: cores.borda },
  secao: { fontSize: 16, fontWeight: '600', color: cores.primaria, marginTop: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  botao: { backgroundColor: cores.primaria, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  passo: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  passoTexto: { fontSize: 22, color: cores.primaria },
  qtd: { minWidth: 36, textAlign: 'center', fontSize: 18 },
  entrada: { backgroundColor: cores.card, borderWidth: 1, borderColor: cores.borda, borderRadius: 10, padding: 12, fontSize: 16, minHeight: 44 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: cores.primaria },
  chipAtivo: { backgroundColor: cores.primaria },
  erro: { color: cores.erro },
});
