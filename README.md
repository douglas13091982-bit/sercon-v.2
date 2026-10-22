# SERCON

Sistema de gestão condominial com React, TanStack Start e Supabase, conectado ao Lovable.

## Etapa entregue: fundação SaaS

- Cadastro de condomínio com conta de síndico e autenticação Supabase.
- Condomínios isolados por RLS, inclusive nas consultas feitas diretamente à API.
- Cadastros persistentes de condomínio, blocos, unidades e moradores.
- Página **Usuários e acessos**: convites de morador e porteiro, expiração em sete dias, aceite com o e-mail confirmado correto e revogação.
- Vínculo entre conta, morador e unidade. Cada conta tem vínculo com um condomínio; não há troca de condomínio pela interface.
- URLs próprias, proteção por papel e página inicial do porteiro em `/portaria`.
- Painel inicial com dados reais e histórico de alterações dos cadastros e acessos.
- Identidade SERCON no login, na navegação e nos metadados.

## Primeiro uso

1. Na tela de entrada, escolha **Criar condomínio**. Confirme o e-mail quando solicitado.
2. Em **Condomínio**, cadastre blocos e unidades.
3. Em **Moradores**, cadastre a pessoa, sua unidade e o e-mail.
4. Em **Usuários e acessos**, gere o link correspondente e compartilhe com a pessoa.
5. O destinatário abre o link, entra ou cria a conta com o e-mail autorizado, confirma o e-mail e aceita o convite.
6. Para remover o acesso, use **Revogar**. Para excluir um morador com login ativo, revogue o acesso primeiro.

Os links são mostrados uma única vez após a geração e não são enviados automaticamente. Um novo convite para o mesmo e-mail no mesmo condomínio invalida o anterior.

## Papéis

| Papel       | Acesso                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| Síndico     | Administração do próprio condomínio, cadastros e convites                |
| Porteiro    | Portaria; leitura de moradores e unidades do próprio condomínio          |
| Morador     | Próprio cadastro e unidade; áreas do morador                             |
| Super Admin | Visão global de condomínios; não pode ser obtido por cadastro ou convite |

A primeira conta Super Admin deve ser atribuída por um operador autorizado no banco, a um usuário já cadastrado. Não existe senha padrão nem promoção automática do primeiro cadastro.

## Próximos módulos

Portaria, Comunicados, Financeiro, Reservas, Assembleias, Manutenção e Configurações ainda contêm exemplos e estão sinalizados como **demonstração**. Seus formulários não têm persistência definitiva nesta etapa.

Ainda não estão implementados Asaas, cobrança e baixa automática, chamados, votação por fração ideal, regras de reservas, QR de visitantes, envio de e-mail/WhatsApp ou relatórios PDF/Excel. O histórico entregue cobre cadastros e acessos; as opções demonstrativas de LGPD não representam controles implementados ou conformidade concluída.

## Desenvolvimento

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

O ambiente conectado ao Lovable já fornece a configuração pública do Supabase. Para outro ambiente, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local`. Nunca use uma chave administrativa no navegador.

Migrações, em ordem, estão em `supabase/migrations`. A migração de acessos e auditoria desta etapa foi aplicada ao banco conectado em 22/10/2026. Não reexecute arquivos já aplicados. Em um banco novo, aplique ambas as migrações.

### Verificação de isolamento no banco

`supabase/tests/fundacao.sql` cria dois condomínios e contas de teste, verifica permissões, aceite e revogação de convites e auditoria. Execute como administrador em uma conexão SQL que preserve a transação. O arquivo termina com `ROLLBACK`; nenhum cadastro de teste deve permanecer.

O roteamento em `src/routeTree.gen.ts` é gerado pelo Vite. Não edite esse arquivo manualmente.

## Lovable

As alterações enviadas para `main` são sincronizadas com o [editor do projeto](https://lovable.dev/projects/9c5a34ba-3f32-4f11-aabd-4e44163b3dfc). Preserve o histórico publicado.
