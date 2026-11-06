# RDO – Diário de Obra

Aplicativo (iPhone e Android) para registrar diariamente o que acontece nas obras e guardar fotos datadas, para depois preencher os diários à mão sem retroativo.

## Stack
React Native + Expo + TypeScript. Desenvolvimento orientado a testes (TDD) com Jest.

## Comandos
- `npm test`: roda os testes
- `npm run typecheck`: verifica os tipos
- `npm start`: abre o app no Expo Go

## Estrutura
- `src/domain`: regras de negócio em TypeScript puro (datas e semanas, registro diário, fotos, obras)

## Decisões
- Dados offline no aparelho; sincronização com o OneDrive na última fase.
- Foto da câmera do app tem data confiável; foto importada da galeria é marcada como importada.

## Como rodar no iPhone (Expo Go, sem Mac)

1. Instale Node.js 22, Git e, no iPhone, o app **Expo Go**.
2. `git clone https://github.com/clintonmatheus/RDO.git && cd RDO && npm install`
3. `npm test` (todos os testes devem passar).
4. `npx expo start` (ou `npx expo start --tunnel` se a rede bloquear) e leia o QR com a Câmera do iPhone.

## Funcionalidades

- Lista das 4 obras → últimos 14 dias da obra → registro do dia (efetivo, equipamentos, ritmo, anotações, fotos).
- Fotos: câmera (só no dia de hoje, data confiável) e galeria (pertence ao dia aberto; data original guardada).
- Diário semanal em PDF (UBS, CAPS III, USF Rocas) com fotos do período; compartilhável pela folha do iOS.
- Dados offline em SQLite no aparelho. Sincronização com OneDrive: fase futura.

## Atualizações recentes

- Diário do CBTU em PDF (paisagem) para qualquer período: mês atual, mês anterior/seguinte ou datas livres (ex.: período de medição).
- Diário semanal SEINFRA com navegação entre semanas.
- Identidade visual: cabeçalho grafite com logomarca do Grupo Passos, ícone do app e cartões com cores de status.
