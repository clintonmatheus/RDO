import { FlatList, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { Obra } from '../domain/obras';
import { Cabecalho } from './Cabecalho';
import { estilos } from './estilos';

interface Props {
  obras: Obra[];
  onAbrir: (obra: Obra) => void;
  topo?: ReactNode;
}

export function ListaObrasTela({ obras, onAbrir, topo }: Props) {
  return (
    <View style={estilos.tela}>
      <Cabecalho logo titulo="Obras" subtitulo="Diário de obra" />
      <FlatList
        contentContainerStyle={estilos.conteudo}
        data={obras}
        keyExtractor={(o) => o.id}
        ListHeaderComponent={topo ? <>{topo}</> : undefined}
        renderItem={({ item }) => (
          <Pressable testID="obra-item" style={estilos.card} onPress={() => onAbrir(item)}>
            <Text style={estilos.etiqueta}>{item.orgao}</Text>
            <Text style={estilos.titulo}>{item.nome}</Text>
            <Text style={estilos.subtitulo}>{`Contrato ${item.contrato} · ${item.local}`}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
