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

## App instalável (sem depender do computador)

As compilações rodam na nuvem do GitHub (aba **Actions**), sem Mac e sem Android Studio.

### Android (.apk)
1. GitHub → **Actions** → *Gerar app Android (APK)* → **Run workflow**.
2. Ao terminar (cerca de 15 min), abra a execução e baixe o arquivo **RDO-android-N** (ZIP) em *Artifacts*.
3. Extraia o ZIP, envie o `.apk` aos mestres de obra (WhatsApp, OneDrive) e instale. Se pedir, permita "Instalar apps de fontes desconhecidas".
4. Para atualizar, instale o `.apk` novo por cima (os dados são mantidos).

### iPhone (.ipa, via Sideloadly)
1. GitHub → **Actions** → *Gerar app iPhone (.ipa sem assinatura)* → **Run workflow**.
2. Baixe **RDO-iphone-N**, extraia o `RDO.ipa`.
3. No Windows, abra o **Sideloadly**, conecte o iPhone, arraste o `.ipa` e informe o Apple ID.
4. No iPhone: *Ajustes → Privacidade e Segurança → Modo Desenvolvedor* (ativar e reiniciar) e *Ajustes → Geral → VPN e Gerenciamento de Dispositivo* (confiar no perfil).
5. Apple ID gratuito: o app expira em 7 dias; conta de desenvolvedor paga: 1 ano.

> Os dados ficam só no aparelho até a etapa de sincronização. Desinstalar o app apaga os registros.

## Servidor (Supabase) — sincronização em tempo real

Pasta `supabase/`:
1. `001_esquema.sql` — tabelas, permissões (RLS), bucket de fotos e tempo real. Rode uma vez no **SQL Editor**.
2. Crie os usuários em **Authentication → Users → Add user** (marque *Auto Confirm User*).
3. `002_administrador.sql` — marca o administrador (troque o e-mail).
4. `003_nomes_dos_usuarios.sql` — nomes exibidos nas anotações.

Regras: todos veem todas as obras; registro do dia (efetivo/equipamentos/ritmo) pode ser alterado por qualquer usuário (fica "editado por"); anotações e fotos só podem ser alteradas/excluídas pelo autor ou pelo administrador.

O app funciona sem internet: grava no aparelho e envia quando houver conexão (`src/sync`). As permissões foram testadas num Postgres local com `supabase/teste/rodar.sh`.

## Exportar fotos para o relatório fotográfico

Na tela de dias da obra: informe o período e toque em **Exportar fotos (ZIP)**. O app gera um ZIP com uma pasta por data
(`2026-11-03/2026-11-03_01.jpg`…), no tamanho em que as fotos foram guardadas, e abre o compartilhamento (Arquivos/OneDrive).
Quem monta o relatório fotográfico escolhe as fotos no computador.
