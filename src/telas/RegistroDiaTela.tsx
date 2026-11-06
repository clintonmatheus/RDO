import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Dados } from '../dados/dados';
import { podeAlterar, type Anotacao } from '../domain/anotacao';
import { diaDaSemana, formatarDataBR, horaLocal, motivoPadraoSemExpediente } from '../domain/datas';
import type { Foto } from '../domain/foto';
import type { Obra } from '../domain/obras';
import {
  EFETIVO_VAZIO, EQUIPAMENTOS, EQUIPAMENTOS_VAZIO, FUNCOES, RITMOS, totalEfetivo,
  type Equipamento, type Funcao, type RegistroDiario, type Ritmo,
} from '../domain/registro';
import type { ServicoFotos } from '../fotos/servico';
import { Cabecalho } from './Cabecalho';
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

function ItemAnotacao({ a, pode, onEditar, onExcluir }: {
  a: Anotacao; pode: boolean; onEditar: (texto: string) => Promise<void>; onExcluir: () => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(a.texto);
  return (
    <View testID="anotacao-item" style={[estilos.card, { gap: 6 }]}>
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
      <ScrollView style={estilos.tela} contentContainerStyle={[estilos.conteudo, { paddingBottom: 48 }]}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>

        <Pressable testID="sem-expediente" style={[estilos.chip, { alignSelf: 'flex-start' }, semExpediente && estilos.chipAtivo]} onPress={() => mudar(setSemExpediente)(!semExpediente)}>
          <Text style={semExpediente ? estilos.chipTextoAtivo : estilos.chipTexto}>Dia sem expediente</Text>
        </Pressable>
        {semExpediente && (
          <TextInput testID="motivo" style={estilos.entrada} placeholder="Motivo (ex.: chuva, feriado)" value={motivo} onChangeText={mudar(setMotivo)} />
        )}

        {!semExpediente && obra.controlaEfetivo && (
          <>
            <Text style={estilos.secao}>Efetivo</Text>
            <View style={estilos.card}>
              {FUNCOES.map((f) => (
                <Contador key={f} nome={f} valor={efetivo[f]} onMudar={(v) => mudar(setEfetivo)({ ...efetivo, [f]: v })} />
              ))}
              <Text testID="total-efetivo" style={estilos.titulo}>{`Total: ${totalEfetivo({ efetivo })}`}</Text>
            </View>
          </>
        )}

        {obra.controlaEfetivo && (
          <>
            <Text style={estilos.secao}>Equipamentos</Text>
            <View style={estilos.card}>
              {EQUIPAMENTOS.map((e) => (
                <Contador key={e} nome={e} valor={equip[e]} onMudar={(v) => mudar(setEquip)({ ...equip, [e]: v })} />
              ))}
            </View>

            <Text style={estilos.secao}>Ritmo dos trabalhos</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {RITMOS.map((r) => (
                <Pressable key={r} testID={`ritmo-${r}`} style={[estilos.chip, ritmo === r && estilos.chipAtivo]} onPress={() => mudar(setRitmo)(r)}>
                  <Text style={ritmo === r ? estilos.chipTextoAtivo : estilos.chipTexto}>{r}</Text>
                </Pressable>
              ))}
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
          <Text style={estilos.botaoTexto}>{obra.controlaEfetivo ? 'Salvar registro' : 'Salvar'}</Text>
        </Pressable>

        <Text style={estilos.secao}>Anotações</Text>
        {anotacoes.map((a) => (
          <ItemAnotacao key={a.id} a={a} pode={podeAlterar(usuario, a)}
            onEditar={(t) => acaoNota(() => dados.editarAnotacao(a.id, t))}
            onExcluir={() => acaoNota(() => dados.excluirAnotacao(a.id))} />
        ))}
        <TextInput testID="nova-anotacao" style={[estilos.entrada, { minHeight: 80 }]} multiline scrollEnabled={false}
          value={novaNota} onChangeText={setNovaNota} placeholder="Serviço executado, ocorrência…" />
        {erroNota && <Text style={estilos.erro}>{erroNota}</Text>}
        <Pressable testID="adicionar-anotacao" style={[estilos.chip, estilos.chipAtivo, { alignSelf: 'flex-start' }]} onPress={adicionarNota}>
          <Text style={estilos.chipTextoAtivo}>Adicionar anotação</Text>
        </Pressable>

        <Text style={estilos.secao}>Fotos</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {data === hoje && (
            <Pressable testID="tirar-foto" style={estilos.chip} onPress={() => adicionarFoto('camera')}>
              <Text style={estilos.chipTexto}>Tirar foto</Text>
            </Pressable>
          )}
          <Pressable testID="foto-galeria" style={estilos.chip} onPress={() => adicionarFoto('galeria')}>
            <Text style={estilos.chipTexto}>Galeria</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {fotos.map((f) => (
            <View key={f.id} testID="foto-item" style={{ gap: 2 }}>
              {f.uri ? (
                <Image source={{ uri: f.uri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
              ) : (
                <View style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: cores.borda, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={estilos.subtitulo}>Baixando…</Text>
                </View>
              )}
              {f.autorNome && <Text style={[estilos.subtitulo, { fontSize: 12 }]}>{f.autorNome}</Text>}
              {podeAlterar(usuario, { autorId: f.autorId ?? usuario.id }) && (
                <Pressable testID="remover-foto" onPress={() => removerFoto(f.id)}><Text style={estilos.erro}>Remover</Text></Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
