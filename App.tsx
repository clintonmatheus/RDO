import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView } from 'react-native';
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
    <SafeAreaView style={{ flex: 1 }}>
      {repo ? <Raiz repositorio={repo.registros} fotos={repo.fotos} servicoFotos={servicoFotosDoApp} gerarPdf={gerarPdfSemanal} hoje={dataLocal(new Date().toISOString())} /> : <ActivityIndicator style={{ flex: 1 }} />}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
