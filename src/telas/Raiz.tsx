import { useState } from 'react';
import { OBRAS_INICIAIS, type Obra } from '../domain/obras';
import type { RepositorioRegistros } from '../storage/contrato';
import { ListaObrasTela } from './ListaObrasTela';
import { RegistroDiaTela } from './RegistroDiaTela';

interface Props {
  repositorio: RepositorioRegistros;
  hoje: string;
}

/** Navegação mínima por estado: lista de obras ↔ registro do dia. */
export function Raiz({ repositorio, hoje }: Props) {
  const [obra, setObra] = useState<Obra>();
  if (!obra) return <ListaObrasTela obras={OBRAS_INICIAIS} onAbrir={setObra} />;
  return <RegistroDiaTela obra={obra} data={hoje} repositorio={repositorio} onVoltar={() => setObra(undefined)} />;
}
