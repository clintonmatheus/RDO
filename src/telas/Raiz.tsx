import { useState } from 'react';
import type { Dados } from '../dados/dados';
import type { DiarioSemanal } from '../diarios/semanal';
import type { Periodo } from '../domain/datas';
import type { Foto } from '../domain/foto';
import { OBRAS_INICIAIS, type Obra } from '../domain/obras';
import type { ServicoFotos } from '../fotos/servico';
import type { EstadoSync } from '../sync/agendador';
import { BarraUsuario } from './BarraUsuario';
import { DiasObraTela } from './DiasObraTela';
import { ListaObrasTela } from './ListaObrasTela';
import { RegistroDiaTela } from './RegistroDiaTela';

interface Props {
  dados: Dados;
  servicoFotos: ServicoFotos;
  hoje: string;
  gerarPdf: (diario: DiarioSemanal) => Promise<void>;
  gerarRelatorio?: (args: { obra: Obra; periodo: Periodo; numeroMedicao: string; fotos: Foto[] }) => Promise<void>;
  /** Incrementado quando chegam dados de outros aparelhos. */
  versao?: number;
  estadoSync?: EstadoSync;
  onSincronizar?: () => void;
  onSair?: () => void;
}

/** Navegação mínima por estado: obras → dias da obra → registro do dia. */
export function Raiz({ dados, servicoFotos, hoje, gerarPdf, gerarRelatorio, versao = 0, estadoSync, onSincronizar, onSair }: Props) {
  const [obra, setObra] = useState<Obra>();
  const [dia, setDia] = useState<string>();
  if (!obra) {
    return (
      <ListaObrasTela obras={OBRAS_INICIAIS} onAbrir={setObra}
        topo={<BarraUsuario nome={dados.usuario.nome} estado={estadoSync} onSincronizar={onSincronizar} onSair={onSair} />} />
    );
  }
  if (!dia) {
    return <DiasObraTela obra={obra} hoje={hoje} dados={dados} versao={versao} gerarPdf={gerarPdf} gerarRelatorio={gerarRelatorio} onAbrir={setDia} onVoltar={() => setObra(undefined)} />;
  }
  return (
    <RegistroDiaTela obra={obra} data={dia} hoje={hoje} dados={dados} versao={versao}
      servicoFotos={servicoFotos} onVoltar={() => setDia(undefined)} />
  );
}
