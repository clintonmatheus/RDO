import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { Obra } from '../domain/obras';
import { Cabecalho } from './Cabecalho';
import { cores, estilos } from './estilos';

interface Props {
  obras: Obra[];
  onAbrir: (obra: Obra) => void;
  topo?: ReactNode;
}

export function ListaObrasTela({ obras, onAbrir, topo }: Props) {
  return (
    <View style={estilos.tela}>
      <Cabecalho titulo="Obras" subtitulo="Diário de obra" />
      <FlatList
        contentContainerStyle={estilos.conteudo}
        data={obras}
        keyExtractor={(o) => o.id}
        ListHeaderComponent={topo ? <>{topo}</> : undefined}
        renderItem={({ item }) => (
          <Pressable testID="obra-item" style={[estilos.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]} onPress={() => onAbrir(item)}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cores.primariaClara, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.orgao === 'CBTU' ? 'train-outline' : 'business-outline'} size={24} color={cores.primaria} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={estilos.titulo}>{item.nome}</Text>
              <Text style={estilos.subtitulo}>{`${item.orgao} · Contrato ${item.contrato}`}</Text>
              <Text style={[estilos.subtitulo, { fontSize: 13 }]} numberOfLines={1}>{item.local}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={cores.suave} />
          </Pressable>
        )}
      />
    </View>
  );
}
