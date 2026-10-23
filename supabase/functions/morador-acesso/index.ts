import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('Secrets do Supabase não configurados.');
    const authorization = request.headers.get('Authorization');
    if (!authorization) return reply(401, { error: 'Faça login novamente.' });

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: authResult, error: authError } = await caller.auth.getUser();
    if (authError || !authResult.user) return reply(401, { error: 'Sessão inválida.' });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      admin.from('profiles').select('condominio_id').eq('id', authResult.user.id).maybeSingle(),
      admin.from('user_roles').select('role').eq('user_id', authResult.user.id),
    ]);
    if (profileError || rolesError) throw new Error('Não foi possível validar o perfil do síndico.');
    if (!profile?.condominio_id || !(roles || []).some((row) => row.role === 'sindico')) {
      return reply(403, { error: 'Somente o síndico do condomínio pode enviar acesso a moradores.' });
    }

    const body = await request.json();
    if (body.action !== 'invite') return reply(400, { error: 'Ação não reconhecida.' });
    const residentId = String(body.moradorId || '');
    if (!residentId) return reply(400, { error: 'Morador não informado.' });
    const { data: resident, error: residentError } = await admin
      .from('moradores')
      .select('id,nome,email,user_id,unidade_id,tipo,condominio_id')
      .eq('id', residentId)
      .eq('condominio_id', profile.condominio_id)
      .maybeSingle();
    if (residentError) throw new Error('Não foi possível carregar o morador.');
    if (!resident || resident.tipo !== 'inquilino' || !resident.unidade_id) return reply(404, { error: 'Inquilino não encontrado nesta unidade.' });
    if (resident.user_id) return reply(409, { error: 'Este morador já possui acesso ao aplicativo.' });
    const email = String(resident.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'Cadastre um e-mail válido para este morador antes de enviar o acesso.' });

    const { data: token, error: inviteError } = await caller.rpc('criar_convite', {
      _email: email,
      _papel: 'morador',
      _morador_id: resident.id,
    });
    if (inviteError || !token) return reply(400, { error: inviteError?.message || 'Não foi possível criar o convite.' });

    const redirectTo = request.headers.get('origin') || undefined;
    const { data: invited, error: authInviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { nome: resident.nome, sercon_convite_token: token },
    });
    if (authInviteError || !invited.user) {
      const alreadyRegistered = /already|registered|exists|cadastrad/i.test(authInviteError?.message || '');
      if (alreadyRegistered) {
        return reply(200, { ok: true, inviteSent: false, requiresExistingLogin: true, token });
      }
      await admin.from('convites_acesso').update({ revogado_em: new Date().toISOString() })
        .eq('condominio_id', profile.condominio_id).eq('email', email).is('aceito_em', null).is('revogado_em', null);
      return reply(400, { error: authInviteError?.message || 'Não foi possível enviar o e-mail de convite.' });
    }

    return reply(200, { ok: true, inviteSent: true });
  } catch (error) {
    return reply(500, { error: error instanceof Error ? error.message : 'Erro inesperado.' });
  }
});
