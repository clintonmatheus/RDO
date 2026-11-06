import { FlatList, Pressable, Text, View } from 'react-native';
import type { Obra } from '../domain/obras';
import { estilos } from './estilos';

interface Props {
  obras: Obra[];
  onAbrir: (obra: Obra) => void;
}

export function ListaObrasTela({ obras, onAbrir }: Props) {
  return (
    <View style={estilos.tela}>
      <FlatList
        contentContainerStyle={estilos.conteudo}
        data={obras}
        keyExtractor={(o) => o.id}
        ListHeaderComponent={<Text style={estilos.titulo}>Obras</Text>}
        renderItem={({ item }) => (
          <Pressable testID="obra-item" style={estilos.card} onPress={() => onAbrir(item)}>
            <Text style={estilos.titulo}>{item.nome}</Text>
            <Text style={estilos.subtitulo}>{`${item.orgao} · Contrato ${item.contrato}`}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
