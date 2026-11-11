import { Image, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { formatarDataBR } from '../domain/datas';
import type { Foto } from '../domain/foto';

/** Foto em tela cheia; no iPhone permite zoom com pinça. Toque em "Fechar" para sair. */
export function FotoAmpliada({ foto, onFechar }: { foto?: Foto; onFechar: () => void }) {
  const { width, height } = useWindowDimensions();
  if (!foto) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onFechar} supportedOrientations={['portrait', 'landscape']}>
      <View testID="foto-ampliada" style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView
          maximumZoomScale={4} minimumZoomScale={1} centerContent bouncesZoom
          showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Image source={{ uri: foto.uri }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
        </ScrollView>
        <View style={{ position: 'absolute', top: 48, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text testID="foto-ampliada-legenda" style={{ color: '#fff', fontSize: 15 }}>
            {`${formatarDataBR(foto.data)}${foto.autorNome ? ` · ${foto.autorNome}` : ''}`}
          </Text>
          <Pressable testID="fechar-foto" onPress={onFechar} hitSlop={12}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
