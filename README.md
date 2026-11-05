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
