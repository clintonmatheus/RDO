import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Dados } from './src/dados/dados';
import { gerarPdfSemanal } from './src/diarios/expo';
import { dataLocal } from './src/domain/datas';
import type { Usuario } from './src/domain/usuario';
import { servicoFotosDoApp } from './src/fotos/expo';
import { novoId } from './src/fotos/id';
import type { Armazenamento } from './src/storage/contrato';
import { abrirBancoDoApp } from './src/storage/expo';
import { criarArmazenamentoSqlite } from './src/storage/sqlite';
import { AgendadorSync, type EstadoSync } from './src/sync/agendador';
import { Sincronizador } from './src/sync/sincronizador';
import { AutenticacaoSupabase, criarClienteSupabase, RemotoSupabase } from './src/sync/supabase';
import { cores } from './src/telas/estilos';
import { LoginTela } from './src/telas/LoginTela';
import { Raiz } from './src/telas/Raiz';

const sb = criarClienteSupabase();
const auth = new AutenticacaoSupabase(sb);
const remoto = new RemotoSupabase(sb);
const agora = () => new Date().toISOString();

export default function App() {
  const [armazenamento, setArmazenamento] = useState<Armazenamento>();
  /** undefined = carregando; null = sem login */
  const [usuario, setUsuario] = useState<Usuario | null>();
  const [estado, setEstado] = useState<EstadoSync>();
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    (async () => {
      setArmazenamento(criarArmazenamentoSqlite(await abrirBancoDoApp()));
      setUsuario((await auth.usuarioAtual()) ?? null);
    })();
  }, []);

  const motor = useMemo(() => {
    if (!armazenamento || !usuario) return undefined;
    const agendador = new AgendadorSync(new Sincronizador(armazenamento, remoto), { atrasoMs: 1500, intervaloMs: 60_000, agora });
    const dados = new Dados(armazenamento, usuario, { agora, novoId, aoAlterar: () => agendador.agendar() });
    return { dados, agendador };
  }, [armazenamento, usuario]);

  useEffect(() => {
    if (!motor) return;
    const pararOuvir = motor.agendador.aoAtualizar((e) => {
      setEstado(e);
      if (e.recebidos > 0) setVersao((v) => v + 1);
    });
    const pararSync = motor.agendador.iniciar();
    const pararTempoReal = remoto.aoMudar(() => motor.agendador.agendar());
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') void motor.agendador.agora(); });
    return () => { pararOuvir(); pararSync(); pararTempoReal(); app.remove(); };
  }, [motor]);

  async function sair() {
    await auth.sair();
    setUsuario(null);
    setEstado(undefined);
  }

  let conteudo;
  if (usuario === undefined || !armazenamento) conteudo = <ActivityIndicator style={{ flex: 1 }} />;
  else if (!usuario || !motor) conteudo = <LoginTela entrar={(e, s) => auth.entrar(e, s)} onEntrou={setUsuario} />;
  else {
    conteudo = (
      <Raiz dados={motor.dados} servicoFotos={servicoFotosDoApp} gerarPdf={gerarPdfSemanal} hoje={dataLocal(agora())}
        versao={versao} estadoSync={estado} onSincronizar={() => void motor.agendador.agora()} onSair={sair} />
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: cores.cabecalho }} />
        {conteudo}
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}
