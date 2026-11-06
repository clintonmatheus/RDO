import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { diaDaSemana, formatarDataBR, motivoPadraoSemExpediente } from '../domain/datas';
import type { Obra } from '../domain/obras';
import {
  criarRegistroDiario, EFETIVO_VAZIO, EQUIPAMENTOS, EQUIPAMENTOS_VAZIO, FUNCOES, RITMOS,
  totalEfetivo, type Equipamento, type Funcao, type Ritmo,
} from '../domain/registro';
import { criarFoto, type Foto } from '../domain/foto';
import type { ServicoFotos } from '../fotos/servico';
import { novoId } from '../fotos/id';
import type { RepositorioFotos, RepositorioRegistros } from '../storage/contrato';
import { Cabecalho } from './Cabecalho';
import { estilos } from './estilos';

interface Props {
  obra: Obra;
  data: string;
  /** Dia de hoje (AAAA-MM-DD): a câmera só é oferecida nele. */
  hoje: string;
  repositorio: RepositorioRegistros;
  fotos: RepositorioFotos;
  servicoFotos: ServicoFotos;
  onVoltar: () => void;
}

function Contador({ nome, valor, onMudar }: { nome: string; valor: number; onMudar: (v: number) => void }) {
  return (
    <View style={estilos.linha}>
      <Text style={{ flex: 1, fontSize: 16, color: '#1C1C1E' }}>{nome}</Text>
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

export function RegistroDiaTela({ obra, data, hoje, repositorio, fotos, servicoFotos, onVoltar }: Props) {
  const [efetivo, setEfetivo] = useState<Record<Funcao, number>>({ ...EFETIVO_VAZIO });
  const [equip, setEquip] = useState<Record<Equipamento, number>>({ ...EQUIPAMENTOS_VAZIO });
  const [ritmo, setRitmo] = useState<Ritmo>('normal');
  const [texto, setTexto] = useState('');
  const padrao = motivoPadraoSemExpediente(data);
  const [semExpediente, setSemExpediente] = useState(padrao !== undefined);
  const [motivo, setMotivo] = useState(padrao ?? '');
  const [erro, setErro] = useState<string>();
  const [lista, setLista] = useState<Foto[]>([]);

  useEffect(() => {
    let ativo = true;
    fotos.listarPorDia(obra.id, data).then((l) => ativo && setLista(l));
    return () => { ativo = false; };
  }, [fotos, obra.id, data]);

  async function adicionar(origem: 'camera' | 'galeria') {
    const f = await (origem === 'camera' ? servicoFotos.tirarFoto() : servicoFotos.escolherDaGaleria());
    if (!f) return;
    const nova = criarFoto({
      id: novoId(), obraId: obra.id, uri: f.uri, origem, capturadaEm: f.capturadaEm,
      dataManual: origem === 'galeria' ? data : undefined,
    });
    await fotos.salvar(nova);
    setLista(await fotos.listarPorDia(obra.id, data));
  }

  async function remover(id: string) {
    await fotos.remover(id);
    setLista(await fotos.listarPorDia(obra.id, data));
  }

  useEffect(() => {
    let ativo = true;
    repositorio.obter(obra.id, data).then((r) => {
      if (!ativo || !r) return;
      setEfetivo(r.efetivo);
      setEquip(r.equipamentos);
      setRitmo(r.ritmo);
      setTexto(r.anotacoes.join('\n'));
      setSemExpediente(!!r.semExpediente);
      setMotivo(r.semExpediente?.motivo ?? '');
    });
    return () => { ativo = false; };
  }, [repositorio, obra.id, data]);

  async function salvar() {
    try {
      const registro = criarRegistroDiario({
        obraId: obra.id, data,
        ritmo: obra.controlaEfetivo ? ritmo : undefined,
        efetivo: semExpediente || !obra.controlaEfetivo ? undefined : efetivo,
        equipamentos: obra.controlaEfetivo ? equip : undefined,
        anotacoes: texto.split('\n'),
        semExpediente: semExpediente ? motivo : undefined,
      });
      await repositorio.salvar(registro);
      onVoltar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <View style={estilos.tela}>
    <Cabecalho titulo={obra.nome} rotuloVoltar="Dias" onVoltar={onVoltar}>
      <Text style={estilos.cabecalhoSub}>{diaDaSemana(data)}</Text>
      <Text style={estilos.cabecalhoTitulo}>{formatarDataBR(data)}</Text>
    </Cabecalho>
    <ScrollView style={estilos.tela} contentContainerStyle={[estilos.conteudo, { paddingBottom: 48 }]}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>

      <Pressable testID="sem-expediente" style={[estilos.chip, { alignSelf: 'flex-start' }, semExpediente && estilos.chipAtivo]} onPress={() => setSemExpediente(!semExpediente)}>
        <Text style={semExpediente ? estilos.chipTextoAtivo : estilos.chipTexto}>Dia sem expediente</Text>
      </Pressable>
      {semExpediente && (
        <TextInput testID="motivo" style={estilos.entrada} placeholder="Motivo (ex.: chuva, feriado)" value={motivo} onChangeText={setMotivo} />
      )}

      {!semExpediente && obra.controlaEfetivo && (
        <>
          <Text style={estilos.secao}>Efetivo</Text>
          <View style={estilos.card}>
            {FUNCOES.map((f) => (
              <Contador key={f} nome={f} valor={efetivo[f]} onMudar={(v) => setEfetivo({ ...efetivo, [f]: v })} />
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
              <Contador key={e} nome={e} valor={equip[e]} onMudar={(v) => setEquip({ ...equip, [e]: v })} />
            ))}
          </View>

          <Text style={estilos.secao}>Ritmo dos trabalhos</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {RITMOS.map((r) => (
              <Pressable key={r} testID={`ritmo-${r}`} style={[estilos.chip, ritmo === r && estilos.chipAtivo]} onPress={() => setRitmo(r)}>
                <Text style={ritmo === r ? estilos.chipTextoAtivo : estilos.chipTexto}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={estilos.secao}>Anotações</Text>
      <TextInput testID="anotacoes" style={[estilos.entrada, { minHeight: 120 }]} multiline scrollEnabled={false} value={texto} onChangeText={setTexto} placeholder="Serviços executados, ocorrências…" />

      <Text style={estilos.secao}>Fotos</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {data === hoje && (
          <Pressable testID="tirar-foto" style={estilos.chip} onPress={() => adicionar('camera')}>
            <Text style={estilos.chipTexto}>Tirar foto</Text>
          </Pressable>
        )}
        <Pressable testID="foto-galeria" style={estilos.chip} onPress={() => adicionar('galeria')}>
          <Text style={estilos.chipTexto}>Galeria</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {lista.map((f) => (
          <View key={f.id} testID="foto-item">
            <Image source={{ uri: f.uri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
            <Pressable testID="remover-foto" onPress={() => remover(f.id)}><Text style={estilos.erro}>Remover</Text></Pressable>
          </View>
        ))}
      </View>

      {erro && <Text style={estilos.erro}>{erro}</Text>}
      <Pressable testID="salvar" style={estilos.botao} onPress={salvar}>
        <Text style={estilos.botaoTexto}>Salvar registro</Text>
      </Pressable>
    </ScrollView>
    </View>
  );
}
