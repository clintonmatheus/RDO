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
  /** Capa do relatório fotográfico (texto em maiúsculas, como no modelo da empresa). */
  relatorio: { licitacao: string; processo: string; objeto: string };
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
    relatorio: {
      licitacao: 'CONTRATO CTR 013-2015 – CBTU',
      processo: 'ART Nº RN20250818940',
      objeto: 'CONSTRUÇÃO DA ESTAÇÃO FERROVIÁRIA BARAÚNA – LINHA SUL – NATAL/RN.',
    },
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
    relatorio: {
      licitacao: 'CONCORRÊNCIA ELETRÔNICA Nº 22.003/2025',
      processo: 'PROCESSO N° 20260490567-SEINFRA',
      objeto: 'CONTRATAÇÃO DE EMPRESA DE ENGENHARIA PARA EXECUÇÃO DOS SERVIÇOS DE CONSTRUÇÃO DE UBS TIPO IV, LOCALIZADA NA AV. BUMBA MEU BOI S/N - LOTEAMENTO JOSÉ SARNEY – BAIRRO LAGOA AZUL – NATAL/RN.',
    },
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
    relatorio: {
      licitacao: 'CONCORRÊNCIA ELETRÔNICA Nº 22.007/2025',
      processo: 'PROCESSO N° 20261518828-SEINFRA',
      objeto: 'CONTRATAÇÃO DE EMPRESA DE ENGENHARIA PARA EXECUÇÃO DOS SERVIÇOS DE CONSTRUÇÃO DO CAPS III – NATAL/RN.',
    },
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
    relatorio: {
      licitacao: 'PREGÃO ELETRÔNICO Nº 22.005/2026',
      processo: 'PROCESSO N° 20261612832-SEINFRA',
      objeto: 'CONTRATAÇÃO DE EMPRESA DE ENGENHARIA PARA EXECUÇÃO DOS SERVIÇOS DE REFORMA DA USF ROCAS – NATAL/RN.',
    },
  },
];

export function obterObra(id: string): Obra {
  const obra = OBRAS_INICIAIS.find((o) => o.id === id);
  if (!obra) throw new Error('Obra não encontrada');
  return obra;
}
