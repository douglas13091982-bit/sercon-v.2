# CondoGestor

Aplicação web para gestão de condomínios, construída com Vite e Supabase.

## Executar localmente

```sh
npm install
npm run dev
```

Configure no ambiente do Vite/Lovable as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O aplicativo exige uma sessão autenticada; o cadastro inicial cria o condomínio e suas configurações financeiras pelo gatilho de cadastro do Supabase.

## Banco de dados

As migrações em `supabase/migrations` complementam o esquema base SERCON. A base deve conter as tabelas de autenticação, condomínios, perfis, papéis, blocos, unidades, moradores, configurações financeiras, leituras e cobranças já existentes.

As novas rotinas registram leituras e configurações por competência e geram cobranças idempotentes para condomínio, água, gás, aluguel opcional e taxas adicionais. O cálculo de cobranças pagas preserva a baixa existente.

## Pagamentos

O síndico pode manter apenas uma forma ativa por condomínio: Pix manual ou Mercado Pago. A migration `20261023040000_condogestor_payment_provider.sql` garante essa exclusividade e cria uma tabela privada para credenciais cifradas. A Edge Function `payment-config` valida o Access Token no Mercado Pago, cifra o segredo no servidor e nunca o devolve ao navegador.

Para habilitar a configuração segura, aplique a migration `20261023040000_condogestor_payment_provider.sql` no SQL Editor do Supabase e publique a função `payment-config`. Crie uma chave aleatória de pelo menos 32 caracteres e configure-a como secret `MP_CREDENTIALS_ENCRYPTION_KEY` do projeto Supabase. Com o CLI instalado, os comandos são `openssl rand -hex 32`, `npx supabase secrets set MP_CREDENTIALS_ENCRYPTION_KEY="SUA_CHAVE" --project-ref SEU_PROJECT_REF` e `npx supabase functions deploy payment-config --project-ref SEU_PROJECT_REF`. O campo Access Token do painel aceita o token da conta do condomínio; ao salvar, o servidor verifica o token com a API do Mercado Pago. A Public Key e as opções Pix, cartão e boleto são mantidas como dados públicos.

O botão de pagamento do morador continua identificado como simulação até o checkout e as notificações de pagamento estarem publicados. O acesso autenticado de moradores e o vínculo entre conta e unidade ainda precisam ser habilitados no aplicativo antes de processar pagamentos reais.

## Portaria e equipe

O módulo Portaria vem desabilitado por padrão. O síndico pode habilitá-lo em **Equipe da portaria** e convidar porteiros e vigilantes por e-mail. Os convidados entram pela mesma tela de login, usando o convite para criar a senha. Desabilitar o módulo bloqueia as leituras e gravações da equipe no servidor.

Para ativar esse recurso, aplique `supabase/migrations/20261023050000_portaria_team.sql` no SQL Editor do Supabase e publique as Edge Functions `portaria-equipe` e `portaria-workspace`. Com o Supabase CLI: `npx supabase functions deploy portaria-equipe --project-ref SEU_PROJECT_REF` e `npx supabase functions deploy portaria-workspace --project-ref SEU_PROJECT_REF`. As duas funções usam os secrets padrão do Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`).
