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

O cadastro de meios e a conferência dos pagamentos ficam armazenados no Supabase. A integração de checkout e baixa automática via Mercado Pago ainda exige uma Edge Function e credenciais privadas configuradas no servidor.
