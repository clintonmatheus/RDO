import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { dataLocal } from './src/domain/datas';
import { RepositorioFotosSqlite, RepositorioRegistrosSqlite } from './src/storage/sqlite';
import { abrirBancoDoApp } from './src/storage/expo';
import type { RepositorioFotos, RepositorioRegistros } from './src/storage/contrato';
import { gerarPdfSemanal } from './src/diarios/expo';
import { servicoFotosDoApp } from './src/fotos/expo';
import { Raiz } from './src/telas/Raiz';

export default function App() {
  const [repo, setRepo] = useState<{ registros: RepositorioRegistros; fotos: RepositorioFotos }>();
  useEffect(() => {
    abrirBancoDoApp().then((b) => setRepo({ registros: new RepositorioRegistrosSqlite(b), fotos: new RepositorioFotosSqlite(b) }));
  }, []);
  return (
    <SafeAreaProvider>
    <View style={{ flex: 1, backgroundColor: '#F2F3F5' }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#2B2B2B' }} />
      {repo ? <Raiz repositorio={repo.registros} fotos={repo.fotos} servicoFotos={servicoFotosDoApp} gerarPdf={gerarPdfSemanal} hoje={dataLocal(new Date().toISOString())} /> : <ActivityIndicator style={{ flex: 1 }} />}
      <StatusBar style="light" />
    </View>
    </SafeAreaProvider>
  );
}
