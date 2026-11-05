import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { formatarDataBR } from '../domain/datas';
import type { Obra } from '../domain/obras';
import {
  criarRegistroDiario, EFETIVO_VAZIO, EQUIPAMENTOS, EQUIPAMENTOS_VAZIO, FUNCOES, RITMOS,
  totalEfetivo, type Equipamento, type Funcao, type Ritmo,
} from '../domain/registro';
import type { RepositorioRegistros } from '../storage/contrato';
import { estilos } from './estilos';

interface Props {
  obra: Obra;
  data: string;
  repositorio: RepositorioRegistros;
  onVoltar: () => void;
}

function Contador({ nome, valor, onMudar }: { nome: string; valor: number; onMudar: (v: number) => void }) {
  return (
    <View style={estilos.linha}>
      <Text style={{ flex: 1, fontSize: 16 }}>{nome}</Text>
      <Pressable testID={`menos-${nome}`} style={estilos.passo} onPress={() => onMudar(Math.max(0, valor - 1))}>
        <Text style={estilos.passoTexto}>−</Text>
      </Pressable>
      <Text testID={`qtd-${nome}`} style={estilos.qtd}>{String(valor)}</Text>
      <Pressable testID={`mais-${nome}`} style={estilos.passo} onPress={() => onMudar(valor + 1)}>
        <Text style={estilos.passoTexto}>+</Text>
      </Pressable>
    </View>
  );
}

export function RegistroDiaTela({ obra, data, repositorio, onVoltar }: Props) {
  const [efetivo, setEfetivo] = useState<Record<Funcao, number>>({ ...EFETIVO_VAZIO });
  const [equip, setEquip] = useState<Record<Equipamento, number>>({ ...EQUIPAMENTOS_VAZIO });
  const [ritmo, setRitmo] = useState<Ritmo>('normal');
  const [texto, setTexto] = useState('');
  const [semExpediente, setSemExpediente] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string>();

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
        obraId: obra.id, data, ritmo,
        efetivo: semExpediente ? undefined : efetivo,
        equipamentos: equip,
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
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
      <Pressable testID="voltar" onPress={onVoltar}><Text style={estilos.subtitulo}>‹ Obras</Text></Pressable>
      <Text style={estilos.titulo}>{obra.nome}</Text>
      <Text style={estilos.subtitulo}>{formatarDataBR(data)}</Text>

      <Pressable testID="sem-expediente" style={[estilos.chip, semExpediente && estilos.chipAtivo]} onPress={() => setSemExpediente(!semExpediente)}>
        <Text style={{ color: semExpediente ? '#fff' : '#1f4e79' }}>Dia sem expediente</Text>
      </Pressable>
      {semExpediente && (
        <TextInput testID="motivo" style={estilos.entrada} placeholder="Motivo (ex.: chuva, feriado)" value={motivo} onChangeText={setMotivo} />
      )}

      {!semExpediente && (
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
            <Text style={{ color: ritmo === r ? '#fff' : '#1f4e79' }}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={estilos.secao}>Anotações (uma por linha)</Text>
      <TextInput testID="anotacoes" style={[estilos.entrada, { minHeight: 120 }]} multiline value={texto} onChangeText={setTexto} placeholder="Serviços executados, ocorrências…" />

      {erro && <Text style={estilos.erro}>{erro}</Text>}
      <Pressable testID="salvar" style={estilos.botao} onPress={salvar}>
        <Text style={estilos.botaoTexto}>Salvar registro</Text>
      </Pressable>
    </ScrollView>
  );
}
