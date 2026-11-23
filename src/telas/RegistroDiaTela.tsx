import { useCallback, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Dados } from '../dados/dados';
import { descricaoEdicao, podeAlterar, type Anotacao } from '../domain/anotacao';
import { diaDaSemana, formatarDataBR, horaLocal, motivoPadraoSemExpediente } from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import {
  EFETIVO_VAZIO, EQUIPAMENTOS, EQUIPAMENTOS_VAZIO, FUNCOES, RITMOS, totalEfetivo,
  type Equipamento, type Funcao, type RegistroDiario, type Ritmo,
} from '../domain/registro';
import type { ServicoFotos } from '../fotos/servico';
import { Cabecalho } from './Cabecalho';
import { FotoAmpliada } from './FotoAmpliada';
import { cores, estilos } from './estilos';

interface Props {
  obra: Obra;
  data: string;
  /** Dia de hoje (AAAA-MM-DD): a câmera só é oferecida nele. */
  hoje: string;
  dados: Dados;
  servicoFotos: ServicoFotos;
  onVoltar: () => void;
  /** Muda quando chegam dados de outros aparelhos (recarrega a tela). */
  versao?: number;
}

function Contador({ nome, valor, onMudar }: { nome: string; valor: number; onMudar: (v: number) => void }) {
  return (
    <View style={estilos.linha}>
      <Text style={{ flex: 1, fontSize: 16, color: cores.texto }}>{nome}</Text>
      <Pressable testID={`menos-${nome}`} style={[estilos.passo, estilos.passoSec]} onPress={() => onMudar(Math.max(0, valor - 1))}>
        <Text style={[estilos.passoTexto, estilos.passoTextoSec]}>−</Text>
      </Pressable>
      <Text testID={`qtd-${nome}`} style={estilos.qtd}>{String(valor)}</Text>
      <Pressable testID={`mais-${nome}`} style={estilos.passo} onPress={() => onMudar(valor + 1)}>
        <Text style={estilos.passoTexto}>+</Text>
      </Pressable>
    </View>
  );
}

type NomeIcone = keyof typeof Ionicons.glyphMap;

function Titulo({ icone, texto, quantidade }: { icone: NomeIcone; texto: string; quantidade?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
      <Ionicons name={icone} size={18} color={cores.primaria} />
      <Text style={{ fontSize: 13, fontWeight: '800', color: cores.chipTexto, textTransform: 'uppercase', letterSpacing: 0.5 }}>{texto}</Text>
      {!!quantidade && (
        <Text style={{ fontSize: 12, fontWeight: '700', color: cores.chipTexto, backgroundColor: cores.fundo, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' }}>{quantidade}</Text>
      )}
    </View>
  );
}

function BotaoFoto({ testID, icone, texto, onPress }: { testID: string; icone: NomeIcone; texto: string; onPress: () => void }) {
  return (
    <Pressable testID={testID} onPress={onPress}
      style={{ width: 96, height: 96, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: cores.primaria, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Ionicons name={icone} size={26} color={cores.primaria} />
      <Text style={{ color: cores.primaria, fontWeight: '600', fontSize: 13 }}>{texto}</Text>
    </Pressable>
  );
}

function ItemAnotacao({ a, pode, onEditar, onExcluir }: {
  a: Anotacao; pode: boolean; onEditar: (texto: string) => Promise<void>; onExcluir: () => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(a.texto);
  return (
    <View testID="anotacao-item" style={{ gap: 4, borderLeftWidth: 3, borderLeftColor: cores.borda, paddingLeft: 10 }}>
      {editando ? (
        <>
          <TextInput testID="editar-texto" style={estilos.entrada} multiline value={texto} onChangeText={setTexto} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable testID="confirmar-edicao" style={[estilos.chip, estilos.chipAtivo]} onPress={async () => { await onEditar(texto); setEditando(false); }}>
              <Text style={estilos.chipTextoAtivo}>Salvar</Text>
            </Pressable>
            <Pressable style={estilos.chip} onPress={() => { setTexto(a.texto); setEditando(false); }}>
              <Text style={estilos.chipTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={{ fontSize: 16, color: cores.texto }}>{a.texto}</Text>
      )}
      {descricaoEdicao(a) && <Text testID="anotacao-edicao" style={[estilos.subtitulo, { fontStyle: 'italic', fontSize: 12 }]}>{descricaoEdicao(a)}</Text>}
      <View style={[estilos.linha, { paddingVertical: 0 }]}>
        <Text testID="anotacao-autor" style={estilos.subtitulo}>{`${a.autorNome} · ${horaLocal(a.criadaEm)}`}</Text>
        {pode && !editando && (
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable testID="editar-anotacao" hitSlop={8} onPress={() => { setTexto(a.texto); setEditando(true); }}>
              <Text style={{ color: cores.primaria, fontWeight: '600' }}>Editar</Text>
            </Pressable>
            <Pressable testID="excluir-anotacao" hitSlop={8} onPress={onExcluir}>
              <Text style={{ color: cores.erro, fontWeight: '600' }}>Excluir</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export function RegistroDiaTela({ obra, data, hoje, dados, servicoFotos, onVoltar, versao = 0 }: Props) {
  const usuario = dados.usuario;
  const [efetivo, setEfetivo] = useState<Record<Funcao, number>>({ ...EFETIVO_VAZIO });
  const [equip, setEquip] = useState<Record<Equipamento, number>>({ ...EQUIPAMENTOS_VAZIO });
  const [ritmo, setRitmo] = useState<Ritmo>('normal');
  const padrao = motivoPadraoSemExpediente(data);
  const [semExpediente, setSemExpediente] = useState(padrao !== undefined);
  const [motivo, setMotivo] = useState(padrao ?? '');
  const [registro, setRegistro] = useState<RegistroDiario>();
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [novaNota, setNovaNota] = useState('');
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [ampliada, setAmpliada] = useState<Foto>();
  const [erro, setErro] = useState<string>();
  const [erroNota, setErroNota] = useState<string>();
  /** Há mudanças no formulário ainda não salvas: atualizações de outros aparelhos não as sobrescrevem. */
  const alterado = useRef(false);
  const mudar = <T,>(set: (v: T) => void) => (v: T) => { alterado.current = true; set(v); };

  const recarregarNotas = useCallback(async () => setAnotacoes(await dados.listarAnotacoes(obra.id, data, data)), [dados, obra.id, data]);
  const recarregarFotos = useCallback(async () => setFotos(await dados.listarFotosDoDia(obra.id, data)), [dados, obra.id, data]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [r, notas, fts] = await Promise.all([
        dados.obterRegistro(obra.id, data), dados.listarAnotacoes(obra.id, data, data), dados.listarFotosDoDia(obra.id, data),
      ]);
      if (!ativo) return;
      setAnotacoes(notas);
      setFotos(fts);
      setRegistro(r);
      if (alterado.current) return;
      if (r) {
        setEfetivo(r.efetivo);
        setEquip(r.equipamentos);
        setRitmo(r.ritmo);
        setSemExpediente(!!r.semExpediente);
        setMotivo(r.semExpediente?.motivo ?? '');
      } else if (notas.length > 0) {
        setSemExpediente(false);
        setMotivo('');
      }
    })();
    return () => { ativo = false; };
  }, [dados, obra.id, data, versao]);

  async function salvar() {
    try {
      await dados.salvarRegistro({
        obraId: obra.id, data,
        ritmo: obra.controlaEfetivo ? ritmo : undefined,
        efetivo: semExpediente || !obra.controlaEfetivo ? undefined : efetivo,
        equipamentos: obra.controlaEfetivo ? equip : undefined,
        semExpediente: semExpediente ? motivo : undefined,
      });
      alterado.current = false;
      onVoltar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function adicionarNota() {
    try {
      setErroNota(undefined);
      await dados.adicionarAnotacao(obra.id, data, novaNota);
      setNovaNota('');
      await recarregarNotas();
    } catch (e) {
      setErroNota((e as Error).message);
    }
  }

  async function acaoNota(fn: () => Promise<unknown>) {
    try { setErroNota(undefined); await fn(); await recarregarNotas(); } catch (e) { setErroNota((e as Error).message); }
  }

  async function adicionarFoto(origem: 'camera' | 'galeria') {
    const f = await (origem === 'camera' ? servicoFotos.tirarFoto() : servicoFotos.escolherDaGaleria());
    if (!f) return;
    await dados.adicionarFoto({
      obraId: obra.id, uri: f.uri, origem, capturadaEm: f.capturadaEm, dataManual: origem === 'galeria' ? data : undefined,
    });
    await recarregarFotos();
  }

  async function removerFoto(id: string) {
    await dados.removerFoto(id);
    await recarregarFotos();
  }

  return (
    <View style={estilos.tela}>
      <Cabecalho titulo={obra.nome} rotuloVoltar="Dias" onVoltar={onVoltar}>
        <Text style={estilos.cabecalhoSub}>{diaDaSemana(data)}</Text>
        <Text style={estilos.cabecalhoTitulo}>{formatarDataBR(data)}</Text>
      </Cabecalho>
      <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>

        <View style={estilos.segmento}>
          {([false, true] as const).map((sem) => (
            <Pressable key={String(sem)} testID={sem ? 'sem-expediente' : 'com-expediente'} onPress={() => mudar(setSemExpediente)(sem)}
              style={[estilos.segmentoItem, semExpediente === sem && estilos.segmentoAtivo]}>
              <Text style={[estilos.segmentoTexto, semExpediente === sem && { color: '#fff' }]}>{sem ? 'Sem expediente' : 'Com expediente'}</Text>
            </Pressable>
          ))}
        </View>
        {semExpediente && (
          <TextInput testID="motivo" style={estilos.entrada} placeholder="Motivo (ex.: chuva, feriado)" placeholderTextColor={cores.suave} value={motivo} onChangeText={mudar(setMotivo)} />
        )}

        {!semExpediente && obra.controlaEfetivo && (
          <View style={estilos.card}>
            <Titulo icone="people-outline" texto="Efetivo" />
            {FUNCOES.map((f) => (
              <Contador key={f} nome={f} valor={efetivo[f]} onMudar={(v) => mudar(setEfetivo)({ ...efetivo, [f]: v })} />
            ))}
            <Text testID="total-efetivo" style={estilos.titulo}>{`Total: ${totalEfetivo({ efetivo })}`}</Text>
          </View>
        )}

        {obra.controlaEfetivo && (
          <>
            <View style={estilos.card}>
              <Titulo icone="construct-outline" texto="Equipamentos" />
              {EQUIPAMENTOS.map((e) => (
                <Contador key={e} nome={e} valor={equip[e]} onMudar={(v) => mudar(setEquip)({ ...equip, [e]: v })} />
              ))}
            </View>
            <View style={[estilos.card, { gap: 10 }]}>
              <Titulo icone="speedometer-outline" texto="Ritmo dos trabalhos" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RITMOS.map((r) => (
                  <Pressable key={r} testID={`ritmo-${r}`} style={[estilos.chip, ritmo === r && estilos.chipAtivo]} onPress={() => mudar(setRitmo)(r)}>
                    <Text style={ritmo === r ? estilos.chipTextoAtivo : estilos.chipTexto}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {registro?.atualizadoPor && registro.atualizadoEm && (
          <Text testID="editado-por" style={estilos.subtitulo}>
            {`Editado por ${registro.atualizadoPor.nome} às ${horaLocal(registro.atualizadoEm)}`}
          </Text>
        )}
        {erro && <Text style={estilos.erro}>{erro}</Text>}
        <Pressable testID="salvar" style={estilos.botao} onPress={salvar}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={estilos.botaoTexto}>{obra.controlaEfetivo ? 'Salvar registro' : 'Salvar o dia'}</Text>
        </Pressable>

        <View style={[estilos.card, { gap: 12 }]}>
          <Titulo icone="create-outline" texto="Anotações" quantidade={anotacoes.length} />
          {anotacoes.map((a) => (
            <ItemAnotacao key={a.id} a={a} pode={podeAlterar(usuario, a)}
              onEditar={(t) => acaoNota(() => dados.editarAnotacao(a.id, t))}
              onExcluir={() => acaoNota(() => dados.excluirAnotacao(a.id))} />
          ))}
          <TextInput testID="nova-anotacao" style={[estilos.entrada, { minHeight: 80, textAlignVertical: 'top' }]} multiline scrollEnabled={false}
            value={novaNota} onChangeText={setNovaNota} placeholder="Serviço executado, ocorrência…" placeholderTextColor={cores.suave} />
          {erroNota && <Text style={estilos.erro}>{erroNota}</Text>}
          <Pressable testID="adicionar-anotacao" style={estilos.botao} onPress={adicionarNota}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={estilos.botaoTexto}>Adicionar anotação</Text>
          </Pressable>
        </View>

        <View style={[estilos.card, { gap: 12 }]}>
          <Titulo icone="images-outline" texto="Fotos do dia" quantidade={fotos.length} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {fotos.map((f) => (
              <View key={f.id} testID="foto-item" style={{ gap: 2, width: 96 }}>
                {f.uri ? (
                  <Pressable testID="abrir-foto" onPress={() => setAmpliada(f)}>
                    <Image source={{ uri: f.uri }} style={{ width: 96, height: 96, borderRadius: 10 }} />
                  </Pressable>
                ) : (
                  <View style={{ width: 96, height: 96, borderRadius: 10, backgroundColor: cores.borda, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[estilos.subtitulo, { fontSize: 12 }]}>Baixando…</Text>
                  </View>
                )}
                {f.autorNome && <Text style={[estilos.subtitulo, { fontSize: 12 }]} numberOfLines={1}>{f.autorNome}</Text>}
                {podeAlterar(usuario, { autorId: f.autorId ?? usuario.id }) && (
                  <Pressable testID="remover-foto" onPress={() => removerFoto(f.id)} hitSlop={6}><Text style={[estilos.erro, { fontSize: 13 }]}>Remover</Text></Pressable>
                )}
              </View>
            ))}
            {data === hoje && <BotaoFoto testID="tirar-foto" icone="camera-outline" texto="Câmera" onPress={() => adicionarFoto('camera')} />}
            <BotaoFoto testID="foto-galeria" icone="image-outline" texto="Galeria" onPress={() => adicionarFoto('galeria')} />
          </View>
        </View>
      </ScrollView>
      <FotoAmpliada foto={ampliada} onFechar={() => setAmpliada(undefined)} />
    </View>
  );
}
