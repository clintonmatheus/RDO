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
import type { Dados } from '../dados/dados';
import { fotosDoPeriodo } from '../relatorio/relatorio';
import { Cabecalho } from './Cabecalho';
import { cores, estilos } from './estilos';

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Props {
  obra: Obra;
  hoje: string;
  dados: Dados;
  /** Muda quando chegam dados de outros aparelhos (recarrega a tela). */
  versao?: number;
  gerarPdf: (diario: DiarioSemanal) => Promise<void>;
  gerarRelatorio?: (args: { obra: Obra; periodo: Periodo; numeroMedicao: string; fotos: Foto[] }) => Promise<void>;
  onAbrir: (data: string) => void;
  onVoltar: () => void;
}

type Tipo = 'registrado' | 'sem-expediente' | 'pendente';

function status(obra: Obra, data: string, r: RegistroDiario | undefined, nFotos: number, nNotas: number): { texto: string; tipo: Tipo } {
  const foto = nFotos > 0 ? ` · ${nFotos} ${nFotos === 1 ? 'foto' : 'fotos'}` : '';
  if (!r && nNotas > 0) return { texto: `Registrado${foto}`, tipo: 'registrado' };
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

export function DiasObraTela({ obra, hoje, dados, gerarPdf, gerarRelatorio, onAbrir, onVoltar, versao = 0 }: Props) {
  const [mes, setMes] = useState<Periodo>(periodoDoMes(hoje));
  const dias: string[] = [];
  for (let d = mes.inicio; d <= mes.fim; d = adicionarDias(d, 1)) dias.push(d);
  const vazios = indiceDiaSemana(mes.inicio);
  const mesAtual = mes.inicio === periodoDoMes(hoje).inicio;
  const semanal = obra.tipoDiario === 'semanal' && !!obra.inicioSemana;
  const inicial: Periodo = semanal ? periodoSemanal(hoje, obra.inicioSemana!) : periodoDoMes(hoje);

  const [porDia, setPorDia] = useState<Record<string, RegistroDiario>>();
  const [fotosDia, setFotosDia] = useState<Record<string, number>>({});
  const [notasDia, setNotasDia] = useState<Record<string, number>>({});
  const [periodo, setPeriodo] = useState<Periodo>(inicial);
  const [de, setDe] = useState(formatarDataBR(inicial.inicio));
  const [ate, setAte] = useState(formatarDataBR(inicial.fim));
  const [erro, setErro] = useState<string>();
  const [gerando, setGerando] = useState(false);
  const mesAtualPeriodo = periodoDoMes(hoje);
  const [relDe, setRelDe] = useState(formatarDataBR(mesAtualPeriodo.inicio));
  const [relAte, setRelAte] = useState(formatarDataBR(mesAtualPeriodo.fim));
  const [medicao, setMedicao] = useState('');
  const [erroRel, setErroRel] = useState<string>();
  const [gerandoRel, setGerandoRel] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [lista, todas, notas] = await Promise.all([
        dados.listarRegistros(obra.id, mes.inicio, mes.fim),
        dados.listarFotosDaObra(obra.id),
        dados.listarAnotacoes(obra.id, mes.inicio, mes.fim),
      ]);
      if (!ativo) return;
      setPorDia(Object.fromEntries(lista.map((r) => [r.data, r])));
      const cont: Record<string, number> = {};
      for (const f of todas as Foto[]) cont[f.data] = (cont[f.data] ?? 0) + 1;
      setFotosDia(cont);
      const cn: Record<string, number> = {};
      for (const a of notas) cn[a.data] = (cn[a.data] ?? 0) + 1;
      setNotasDia(cn);
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra.id, mes.inicio, dados, versao]);

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
        const [regs, todas, notas] = await Promise.all([
          dados.listarRegistros(obra.id, periodo.inicio, periodo.fim), dados.listarFotosDaObra(obra.id), dados.listarAnotacoes(obra.id, periodo.inicio, periodo.fim),
        ]);
        diario = montarDiarioSemanal(obra, periodo.inicio, regs, todas, notas);
      } else {
        const p: Periodo = { inicio: analisarDataBR(de), fim: analisarDataBR(ate) };
        const [regs, todas, notas] = await Promise.all([
          dados.listarRegistros(obra.id, p.inicio, p.fim), dados.listarFotosDaObra(obra.id), dados.listarAnotacoes(obra.id, p.inicio, p.fim),
        ]);
        diario = montarDiarioCbtu(obra, p, regs, todas, notas);
      }
      setGerando(true);
      await gerarPdf(diario);
    } catch (e) {
      setErro((e as Error).message || 'Não foi possível gerar o PDF');
    } finally {
      setGerando(false);
    }
  }

  async function gerarRel() {
    if (!gerarRelatorio) return;
    setErroRel(undefined);
    try {
      const periodoRel: Periodo = { inicio: analisarDataBR(relDe), fim: analisarDataBR(relAte) };
      if (periodoRel.inicio > periodoRel.fim) throw new Error('Período inválido');
      const fotosRel = fotosDoPeriodo(await dados.listarFotosDaObra(obra.id), periodoRel);
      if (!fotosRel.length) throw new Error('Nenhuma foto no período');
      setGerandoRel(true);
      await gerarRelatorio({ obra, periodo: periodoRel, numeroMedicao: medicao, fotos: fotosRel });
    } catch (e) {
      setErroRel((e as Error).message || 'Não foi possível gerar o relatório');
    } finally {
      setGerandoRel(false);
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

        {gerarRelatorio && (
          <>
            <Text style={estilos.secao}>Relatório fotográfico (PowerPoint)</Text>
            <View style={[estilos.card, { gap: 8 }]}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput testID="relatorio-de" style={[estilos.entrada, { flex: 1 }]} value={relDe} onChangeText={setRelDe} placeholder="De" keyboardType="numbers-and-punctuation" />
                <TextInput testID="relatorio-ate" style={[estilos.entrada, { flex: 1 }]} value={relAte} onChangeText={setRelAte} placeholder="Até" keyboardType="numbers-and-punctuation" />
              </View>
              <TextInput testID="medicao-numero" style={estilos.entrada} value={medicao} onChangeText={setMedicao} placeholder="Nº da medição (ex.: 10)" keyboardType="number-pad" />
              {erroRel && <Text style={estilos.erro}>{erroRel}</Text>}
              <Pressable testID="gerar-relatorio" style={[estilos.botao, gerandoRel && { opacity: 0.6 }]} disabled={gerandoRel} onPress={gerarRel}>
                <Text style={estilos.botaoTexto}>{gerandoRel ? 'Gerando…' : 'Gerar relatório fotográfico'}</Text>
              </Pressable>
            </View>
          </>
        )}

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
              const s = status(obra, d, porDia[d], fotosDia[d] ?? 0, notasDia[d] ?? 0);
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
