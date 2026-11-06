import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { adicionarDias, diaDaSemana, formatarDataBR, motivoPadraoSemExpediente } from '../domain/datas';
import type { Obra } from '../domain/obras';
import { totalEfetivo, type RegistroDiario } from '../domain/registro';
import type { Foto } from '../domain/foto';
import type { RepositorioFotos, RepositorioRegistros } from '../storage/contrato';
import { montarDiarioSemanal, type DiarioSemanal } from '../diarios/semanal';
import { periodoSemanal } from '../domain/datas';
import { estilos } from './estilos';

const DIAS = 14;

interface Props {
  obra: Obra;
  hoje: string;
  registros: RepositorioRegistros;
  fotos: RepositorioFotos;
  gerarPdf: (diario: DiarioSemanal) => Promise<void>;
  onAbrir: (data: string) => void;
  onVoltar: () => void;
}

function status(obra: Obra, data: string, r: RegistroDiario | undefined, nFotos: number): string {
  const foto = nFotos > 0 ? ` · ${nFotos} ${nFotos === 1 ? 'foto' : 'fotos'}` : '';
  if (!r) {
    const padrao = motivoPadraoSemExpediente(data);
    return padrao ? `Sem expediente: ${padrao}${foto}` : `Sem registro${foto}`;
  }
  if (r.semExpediente) return `Sem expediente: ${r.semExpediente.motivo}${foto}`;
  const efetivo = obra.controlaEfetivo ? ` · ${totalEfetivo(r)} no efetivo` : '';
  return `Registrado${efetivo}${foto}`;
}

export function DiasObraTela({ obra, hoje, registros, fotos, gerarPdf, onAbrir, onVoltar }: Props) {
  const dias = Array.from({ length: DIAS }, (_, i) => adicionarDias(hoje, -i));
  const [porDia, setPorDia] = useState<Record<string, RegistroDiario>>();
  const [fotosDia, setFotosDia] = useState<Record<string, number>>({});

  useEffect(() => {
    let ativo = true;
    (async () => {
      const lista = await registros.listar(obra.id, dias[DIAS - 1], dias[0]);
      const todas: Foto[] = await fotos.listarPorObra(obra.id);
      if (!ativo) return;
      setPorDia(Object.fromEntries(lista.map((r) => [r.data, r])));
      const cont: Record<string, number> = {};
      for (const f of todas) cont[f.data] = (cont[f.data] ?? 0) + 1;
      setFotosDia(cont);
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra.id, hoje, registros, fotos]);

  async function gerarSemanal() {
    if (!obra.inicioSemana) return;
    const { inicio, fim } = periodoSemanal(hoje, obra.inicioSemana);
    const [regs, todas] = await Promise.all([registros.listar(obra.id, inicio, fim), fotos.listarPorObra(obra.id)]);
    await gerarPdf(montarDiarioSemanal(obra, hoje, regs, todas));
  }

  if (!porDia) return null;
  return (
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo}>
      <Pressable testID="voltar" onPress={onVoltar}><Text style={estilos.subtitulo}>‹ Obras</Text></Pressable>
      <Text style={estilos.titulo}>{obra.nome}</Text>
      {obra.tipoDiario === 'semanal' && (
        <Pressable testID="gerar-semanal" style={estilos.botao} onPress={gerarSemanal}>
          <Text style={estilos.botaoTexto}>Gerar diário da semana (PDF)</Text>
        </Pressable>
      )}
      {dias.map((d) => (
        <Pressable key={d} testID={`dia-${d}`} style={estilos.card} onPress={() => onAbrir(d)}>
          <Text testID="dia-item" style={estilos.titulo}>{`${diaDaSemana(d)} ${formatarDataBR(d)}`}</Text>
          <Text testID={`status-${d}`} style={estilos.subtitulo}>{status(obra, d, porDia[d], fotosDia[d] ?? 0)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
