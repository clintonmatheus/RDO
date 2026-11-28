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
5. `004_auditoria_e_fotos.sql` — auditoria (guarda a versão anterior de cada alteração, consultas prontas no fim do arquivo) e só o autor ou o administrador substitui o arquivo de uma foto. Se rodar a `001` de novo, rode a `004` depois.
6. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**: os logins são criados só por você, em Authentication → Users.

Regras: todos veem todas as obras; registro do dia (efetivo/equipamentos/ritmo) pode ser alterado por qualquer usuário (fica "editado por"); anotações e fotos só podem ser alteradas/excluídas pelo autor ou pelo administrador.

O app funciona sem internet: grava no aparelho e envia quando houver conexão (`src/sync`). As permissões foram testadas num Postgres local com `supabase/teste/rodar.sh`.

## Exportar fotos para o relatório fotográfico

Na tela de dias da obra: informe o período e toque em **Exportar fotos (ZIP)**. O app gera um ZIP com uma pasta por data
(`2026-11-03/2026-11-03_01.jpg`…), no tamanho em que as fotos foram guardadas, e abre o compartilhamento (Arquivos/OneDrive).
Quem monta o relatório fotográfico escolhe as fotos no computador.

## Cópia diária dos dados (backup)

- **O que faz** (`.github/workflows/backup.yml`): todo dia às 03:17 (Brasília) acessa o Supabase, copia as tabelas (`registros`, `anotacoes`, lista de `fotos`, `perfis`, `auditoria`) e os logins (sem senhas), criptografa (AES-256) e guarda como artefato por 90 dias. **Aos domingos** (ou em Run workflow marcando *Copiar também os arquivos das fotos*) copia também os arquivos das fotos, numa cópia separada `rdo-fotos-AAAA-MM-DD` guardada por 14 dias. O acesso diário também **mantém o projeto gratuito ativo** (o Supabase pausa projetos sem uso por 7 dias).
- **Segredos** (Settings → Secrets and variables → Actions → New repository secret):
  - `SUPABASE_SERVICE_KEY`: chave secreta do projeto do RDO (Project Settings → API Keys → Secret key). Nunca vai para o app.
  - `BACKUP_SENHA`: senha com 12 caracteres ou mais para abrir as cópias; guarde-a fora do GitHub.
- **Rodar na hora:** Actions → Cópia diária dos dados → Run workflow.
- **Abrir uma cópia:** baixe o artefato e rode `node scripts/backup/abrir.mjs rdo-backup-AAAA-MM-DD.tar.gz.enc`; descompacte o `.tar.gz`.
- **Restaurar:** `node scripts/backup/restaurar.mjs sql <pasta> > restaurar.sql` e rode no SQL Editor (grava por cima pela chave, não apaga nada; só entram linhas de logins que existem). Fotos: `SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/backup/restaurar.mjs arquivos <pasta-da-cópia-das-fotos>`.
- Testes: `npm run test:backup`.

## Versão web e iPhone (atalho na tela inicial)

Para quem usa iPhone (ou computador), há uma versão web que funciona como o app: login, registros, anotações, fotos (câmera ou galeria), sincronização, PDF do diário e ZIP de fotos.
- **Publicar:** GitHub → Actions → **Publicar versão para computador (web)** → Run workflow. Endereço: `https://clintonmatheus.github.io/RDO/` (ative Settings → Pages → Deploy from a branch → gh-pages). Em repositório privado, o GitHub Pages exige plano pago.
- **Instalar no iPhone:** Safari → Compartilhar → **Adicionar à Tela de Início**. O passo `scripts/pwa.mjs` grava o manifesto e os ícones (`public/icones/`, gerados de `assets/icon.png`).
- **Offline:** os dados e as fotos ficam no navegador (IndexedDB, `src/storage/abrir.web.ts`) e sobem quando há internet. O iPhone pode apagar os dados de sites que ficam muitas semanas sem uso; por isso, sincronize antes de deixar o app parado. Fotos são reduzidas a 1600 px.
- **PDF:** abre a impressão do navegador; escolha "Salvar como PDF" ou compartilhar.
