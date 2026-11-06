import { diaDaSemana } from './datas';
import type { Usuario } from './usuario';

export const FUNCOES = ['Mestre de Obra', 'Servente', 'Pedreiro', 'Eletricista', 'Encanador', 'Pintor'] as const;
export const EQUIPAMENTOS = ['Serra mármore', 'Furadeira', 'Martelete', 'Betoneira', 'Andaime'] as const;
export const RITMOS = ['lento', 'normal', 'acelerado'] as const;

export type Funcao = (typeof FUNCOES)[number];
export type Equipamento = (typeof EQUIPAMENTOS)[number];
export type Ritmo = (typeof RITMOS)[number];

export const EFETIVO_VAZIO: Record<Funcao, number> = {
  'Mestre de Obra': 0, Servente: 0, Pedreiro: 0, Eletricista: 0, Encanador: 0, Pintor: 0,
};
export const EQUIPAMENTOS_VAZIO: Record<Equipamento, number> = {
  'Serra mármore': 0, Furadeira: 0, Martelete: 0, Betoneira: 0, Andaime: 0,
};

export interface RegistroDiario {
  id: string;
  obraId: string;
  data: string; // AAAA-MM-DD
  efetivo: Record<Funcao, number>;
  equipamentos: Record<Equipamento, number>;
  ritmo: Ritmo;
  semExpediente?: { motivo: string };
  /** Última alteração (exibida como "editado por Fulano às HH:MM"). */
  atualizadoEm?: string;
  atualizadoPor?: { id: string; nome: string };
}

export interface NovoRegistro {
  obraId: string;
  data: string;
  efetivo?: Partial<Record<Funcao, number>>;
  equipamentos?: Partial<Record<Equipamento, number>>;
  ritmo?: Ritmo;
  semExpediente?: string;
  autor?: Usuario;
  agora?: string;
}

function validarQuantidades(valores: Record<string, number | undefined>): void {
  for (const v of Object.values(valores)) {
    if (v !== undefined && (!Number.isInteger(v) || v < 0)) throw new Error('Quantidade inválida');
  }
}

export function totalEfetivo(r: Pick<RegistroDiario, 'efetivo'>): number {
  return Object.values(r.efetivo).reduce((soma, n) => soma + n, 0);
}

export function criarRegistroDiario(novo: NovoRegistro): RegistroDiario {
  diaDaSemana(novo.data); // valida a data
  validarQuantidades(novo.efetivo ?? {});
  validarQuantidades(novo.equipamentos ?? {});

  const registro: RegistroDiario = {
    id: `${novo.obraId}|${novo.data}`,
    obraId: novo.obraId,
    data: novo.data,
    efetivo: { ...EFETIVO_VAZIO, ...novo.efetivo },
    equipamentos: { ...EQUIPAMENTOS_VAZIO, ...novo.equipamentos },
    ritmo: novo.ritmo ?? 'normal',
  };
  if (novo.autor) registro.atualizadoPor = { id: novo.autor.id, nome: novo.autor.nome };
  if (novo.agora) registro.atualizadoEm = novo.agora;

  if (novo.semExpediente !== undefined) {
    const motivo = novo.semExpediente.trim();
    if (!motivo) throw new Error('Informe o motivo');
    if (totalEfetivo(registro) > 0) throw new Error('Dia sem expediente não pode ter efetivo');
    registro.semExpediente = { motivo };
  }
  return registro;
}
