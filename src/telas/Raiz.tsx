import { useState } from 'react';
import { OBRAS_INICIAIS, type Obra } from '../domain/obras';
import type { ServicoFotos } from '../fotos/servico';
import type { RepositorioFotos, RepositorioRegistros } from '../storage/contrato';
import { DiasObraTela } from './DiasObraTela';
import { ListaObrasTela } from './ListaObrasTela';
import { RegistroDiaTela } from './RegistroDiaTela';

interface Props {
  repositorio: RepositorioRegistros;
  fotos: RepositorioFotos;
  servicoFotos: ServicoFotos;
  hoje: string;
}

/** Navegação mínima por estado: obras → dias da obra → registro do dia. */
export function Raiz({ repositorio, fotos, servicoFotos, hoje }: Props) {
  const [obra, setObra] = useState<Obra>();
  const [dia, setDia] = useState<string>();
  if (!obra) return <ListaObrasTela obras={OBRAS_INICIAIS} onAbrir={setObra} />;
  if (!dia) {
    return <DiasObraTela obra={obra} hoje={hoje} registros={repositorio} fotos={fotos} onAbrir={setDia} onVoltar={() => setObra(undefined)} />;
  }
  return (
    <RegistroDiaTela obra={obra} data={dia} hoje={hoje} repositorio={repositorio} fotos={fotos}
      servicoFotos={servicoFotos} onVoltar={() => setDia(undefined)} />
  );
}
