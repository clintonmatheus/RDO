import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView } from 'react-native';
import { dataLocal } from './src/domain/datas';
import { RepositorioRegistrosSqlite } from './src/storage/sqlite';
import { abrirBancoDoApp } from './src/storage/expo';
import type { RepositorioRegistros } from './src/storage/contrato';
import { Raiz } from './src/telas/Raiz';

export default function App() {
  const [repo, setRepo] = useState<RepositorioRegistros>();
  useEffect(() => {
    abrirBancoDoApp().then((b) => setRepo(new RepositorioRegistrosSqlite(b)));
  }, []);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {repo ? <Raiz repositorio={repo} hoje={dataLocal(new Date().toISOString())} /> : <ActivityIndicator style={{ flex: 1 }} />}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
