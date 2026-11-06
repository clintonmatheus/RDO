import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { montarDiarioCbtu } from '../diarios/cbtu';
import { montarDiarioSemanal, type DiarioSemanal } from '../diarios/semanal';
import {
  adicionarDias, analisarDataBR, deslocarPeriodo, formatarDataBR, indiceDiaSemana, motivoPadraoSemExpediente, nomeDoMes,
  periodoDoMes, periodoMesAnterior, periodoMesSeguinte, periodoSemanal, type Periodo,
} from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import { totalEfetivo, type RegistroDiario } from '../domain/registro';
import type { RepositorioFotos, RepositorioRegistros } from '../storage/contrato';
import { Cabecalho } from './Cabecalho';
import { cores, estilos } from './estilos';

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Props {
  obra: Obra;
  hoje: string;
  registros: RepositorioRegistros;
  fotos: RepositorioFotos;
  gerarPdf: (diario: DiarioSemanal) => Promise<void>;
  onAbrir: (data: string) => void;
  onVoltar: () => void;
}

type Tipo = 'registrado' | 'sem-expediente' | 'pendente';

function status(obra: Obra, data: string, r: RegistroDiario | undefined, nFotos: number): { texto: string; tipo: Tipo } {
  const foto = nFotos > 0 ? ` · ${nFotos} ${nFotos === 1 ? 'foto' : 'fotos'}` : '';
  if (!r) {
    const padrao = motivoPadraoSemExpediente(data);
    return padrao
      ? { texto: `Sem expediente: ${padrao}${foto}`, tipo: 'sem-expediente' }
      : { texto: `Sem registro${foto}`, tipo: 'pendente' };
  }
  if (r.semExpediente) return { texto: `Sem expediente: ${r.semExpediente.motivo}${foto}`, tipo: 'sem-expediente' };
  const efetivo = obra.controlaEfetivo ? ` · ${totalEfetivo(r)} no efetivo` : '';
  return { texto: `Registrado${efetivo}${foto}`, tipo: 'registrado' };
}

const corDoTipo: Record<Tipo, string> = { registrado: cores.ok, 'sem-expediente': cores.suave, pendente: cores.aviso };

function Seta({ id, texto, onPress }: { id: string; texto: string; onPress: () => void }) {
  return (
    <Pressable testID={id} style={[estilos.passo, estilos.passoSec]} onPress={onPress}>
      <Text style={[estilos.passoTexto, estilos.passoTextoSec]}>{texto}</Text>
    </Pressable>
  );
}

export function DiasObraTela({ obra, hoje, registros, fotos, gerarPdf, onAbrir, onVoltar }: Props) {
  const [mes, setMes] = useState<Periodo>(periodoDoMes(hoje));
  const dias: string[] = [];
  for (let d = mes.inicio; d <= mes.fim; d = adicionarDias(d, 1)) dias.push(d);
  const vazios = indiceDiaSemana(mes.inicio);
  const mesAtual = mes.inicio === periodoDoMes(hoje).inicio;
  const semanal = obra.tipoDiario === 'semanal' && !!obra.inicioSemana;
  const inicial: Periodo = semanal ? periodoSemanal(hoje, obra.inicioSemana!) : periodoDoMes(hoje);

  const [porDia, setPorDia] = useState<Record<string, RegistroDiario>>();
  const [fotosDia, setFotosDia] = useState<Record<string, number>>({});
  const [periodo, setPeriodo] = useState<Periodo>(inicial);
  const [de, setDe] = useState(formatarDataBR(inicial.inicio));
  const [ate, setAte] = useState(formatarDataBR(inicial.fim));
  const [erro, setErro] = useState<string>();
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const lista = await registros.listar(obra.id, mes.inicio, mes.fim);
      const todas: Foto[] = await fotos.listarPorObra(obra.id);
      if (!ativo) return;
      setPorDia(Object.fromEntries(lista.map((r) => [r.data, r])));
      const cont: Record<string, number> = {};
      for (const f of todas) cont[f.data] = (cont[f.data] ?? 0) + 1;
      setFotosDia(cont);
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra.id, mes.inicio, registros, fotos]);

  function aplicar(p: Periodo) {
    setPeriodo(p);
    setDe(formatarDataBR(p.inicio));
    setAte(formatarDataBR(p.fim));
    setErro(undefined);
  }

  function periodoAtual(): Periodo {
    try { return { inicio: analisarDataBR(de), fim: analisarDataBR(ate) }; } catch { return periodo; }
  }

  function mover(direcao: -1 | 1) {
    if (semanal) aplicar(deslocarPeriodo(periodo, 7 * direcao));
    else aplicar(direcao < 0 ? periodoMesAnterior(periodoAtual()) : periodoMesSeguinte(periodoAtual()));
  }

  async function gerar() {
    setErro(undefined);
    try {
      let diario: DiarioSemanal;
      if (semanal) {
        const [regs, todas] = await Promise.all([registros.listar(obra.id, periodo.inicio, periodo.fim), fotos.listarPorObra(obra.id)]);
        diario = montarDiarioSemanal(obra, periodo.inicio, regs, todas);
      } else {
        const p: Periodo = { inicio: analisarDataBR(de), fim: analisarDataBR(ate) };
        const [regs, todas] = await Promise.all([registros.listar(obra.id, p.inicio, p.fim), fotos.listarPorObra(obra.id)]);
        diario = montarDiarioCbtu(obra, p, regs, todas);
      }
      setGerando(true);
      await gerarPdf(diario);
    } catch (e) {
      setErro((e as Error).message || 'Não foi possível gerar o PDF');
    } finally {
      setGerando(false);
    }
  }

  if (!porDia) return null;
  return (
    <View style={estilos.tela}>
      <Cabecalho titulo={obra.nome} subtitulo={`${obra.orgao} · Contrato ${obra.contrato}`} rotuloVoltar="Obras" onVoltar={onVoltar} />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.secao}>Diário em PDF</Text>
        <View style={estilos.card}>
          <View style={estilos.linha}>
            <Seta id="periodo-anterior" texto="‹" onPress={() => mover(-1)} />
            {semanal ? (
              <Text testID="periodo-rotulo" style={estilos.titulo}>{`${formatarDataBR(periodo.inicio)} a ${formatarDataBR(periodo.fim)}`}</Text>
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                <TextInput testID="periodo-de" style={[estilos.entrada, { flex: 1 }]} value={de} onChangeText={setDe} placeholder="De" keyboardType="numbers-and-punctuation" />
                <TextInput testID="periodo-ate" style={[estilos.entrada, { flex: 1 }]} value={ate} onChangeText={setAte} placeholder="Até" keyboardType="numbers-and-punctuation" />
              </View>
            )}
            <Seta id="periodo-proximo" texto="›" onPress={() => mover(1)} />
          </View>
          {erro && <Text style={estilos.erro}>{erro}</Text>}
          <Pressable testID={semanal ? 'gerar-semanal' : 'gerar-mensal'} style={[estilos.botao, gerando && { opacity: 0.6 }]} disabled={gerando} onPress={gerar}>
            <Text style={estilos.botaoTexto}>{gerando ? 'Gerando…' : semanal ? 'Gerar diário da semana (PDF)' : 'Gerar diário do período (PDF)'}</Text>
          </Pressable>
        </View>

        <Text style={estilos.secao}>Calendário</Text>
        <View style={estilos.card}>
          <View style={estilos.linha}>
            <Seta id="mes-anterior" texto="‹" onPress={() => setMes(periodoMesAnterior(mes))} />
            <Text testID="mes-rotulo" style={[estilos.titulo, { textTransform: 'capitalize' }]}>{nomeDoMes(mes.inicio)}</Text>
            <Pressable testID="mes-proximo" disabled={mesAtual} style={[estilos.passo, estilos.passoSec, mesAtual && { opacity: 0.3 }]} onPress={() => setMes(periodoMesSeguinte(mes))}>
              <Text style={[estilos.passoTexto, estilos.passoTextoSec]}>›</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {SEMANA.map((n) => (
              <Text key={n} style={[estilos.subtitulo, { width: '14.2857%', textAlign: 'center', fontWeight: '600' }]}>{n}</Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: vazios }, (_, i) => <View key={`v${i}`} style={{ width: '14.2857%', height: 52 }} />)}
            {dias.map((d) => {
              const s = status(obra, d, porDia[d], fotosDia[d] ?? 0);
              const futuro = d > hoje;
              return (
                <View key={d} style={{ width: '14.2857%', height: 52, padding: 2 }}>
                  <Pressable
                    testID={`dia-${d}`}
                    accessibilityLabel={`${formatarDataBR(d)}: ${s.texto}`}
                    disabled={futuro}
                    onPress={() => onAbrir(d)}
                    style={{
                      flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 4,
                      backgroundColor: futuro ? 'transparent' : cores.fundo,
                      borderWidth: d === hoje ? 2 : 0, borderColor: cores.primaria, opacity: futuro ? 0.35 : 1,
                    }}
                  >
                    <Text testID="dia-item" style={{ fontSize: 15, fontWeight: '600', color: cores.texto }}>{String(Number(d.slice(8)))}</Text>
                    {!futuro && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: corDoTipo[s.tipo] }} />}
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {([['registrado', 'Registrado'], ['pendente', 'Pendente'], ['sem-expediente', 'Sem expediente']] as [Tipo, string][]).map(([t, n]) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: corDoTipo[t] }} />
                <Text style={estilos.subtitulo}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
