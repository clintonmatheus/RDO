import type { InicioSemana } from './datas';

export interface Obra {
  id: string;
  nome: string;
  orgao: 'CBTU' | 'SEINFRA';
  contrato: string;
  art?: string;
  local: string;
  /** Registra efetivo, equipamentos e ritmo (formulário do CBTU). */
  controlaEfetivo: boolean;
  tipoDiario: 'diario' | 'semanal';
  inicioSemana?: InicioSemana;
}

export const OBRAS_INICIAIS: Obra[] = [
  {
    id: 'cbtu-barauna',
    nome: 'Construção da Estação Ferroviária Baraúna',
    orgao: 'CBTU',
    contrato: 'CTR 013-2015',
    art: 'RN20250818940',
    local: 'Natal/RN',
    controlaEfetivo: true,
    tipoDiario: 'diario',
  },
  {
    id: 'ubs',
    nome: 'Construção de UBS no Lot. José Sarney',
    orgao: 'SEINFRA',
    contrato: '029/2025',
    local: 'Natal/RN',
    controlaEfetivo: false,
    tipoDiario: 'semanal',
    inicioSemana: 'sabado',
  },
  {
    id: 'caps',
    nome: 'Construção do CAPS III',
    orgao: 'SEINFRA',
    contrato: '030/2025',
    local: 'Natal/RN',
    controlaEfetivo: false,
    tipoDiario: 'semanal',
    inicioSemana: 'sabado',
  },
  {
    id: 'usf-rocas',
    nome: 'Reforma da USF Rocas',
    orgao: 'SEINFRA',
    contrato: '025/2026',
    local: 'Natal/RN',
    controlaEfetivo: false,
    tipoDiario: 'semanal',
    inicioSemana: 'segunda',
  },
];

export function obterObra(id: string): Obra {
  const obra = OBRAS_INICIAIS.find((o) => o.id === id);
  if (!obra) throw new Error('Obra não encontrada');
  return obra;
}
