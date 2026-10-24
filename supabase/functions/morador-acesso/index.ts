import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });

  let newlyCreatedUserId = '';
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
      return reply(403, { error: 'Somente o síndico do condomínio pode cadastrar acesso de moradores.' });
    }

    const body = await request.json();
    if (body.action !== 'create-access') return reply(400, { error: 'Ação não reconhecida.' });
    const residentId = String(body.moradorId || '');
    const email = String(body.email || '').trim().toLowerCase();
    if (!residentId) return reply(400, { error: 'Morador não informado.' });
    if (!validEmail(email)) return reply(400, { error: 'Informe um e-mail válido para este morador.' });

    const { data: resident, error: residentError } = await admin.from('moradores')
      .select('id,nome,email,telefone,user_id,unidade_id,tipo,condominio_id')
      .eq('id', residentId)
      .eq('condominio_id', profile.condominio_id)
      .maybeSingle();
    if (residentError) throw new Error('Não foi possível carregar o morador.');
    if (!resident || resident.tipo !== 'inquilino' || !resident.unidade_id) return reply(404, { error: 'Inquilino não encontrado nesta unidade.' });
    if (resident.user_id) return reply(409, { error: 'Este morador já possui acesso ao aplicativo.' });

    const initialPassword = String(resident.telefone || '').replace(/\D/g, '');
    if (initialPassword.length < 8) return reply(400, { error: 'Cadastre um telefone válido com pelo menos 8 números para usar como senha inicial.' });

    const { data: savedResident, error: saveEmailError } = await admin.from('moradores')
      .update({ email })
      .eq('id', resident.id)
      .eq('condominio_id', profile.condominio_id)
      .select('id,email')
      .maybeSingle();
    if (saveEmailError) throw new Error('Não foi possível salvar o e-mail de acesso: ' + saveEmailError.message);
    if (!savedResident) throw new Error('O e-mail não foi salvo no cadastro do morador. Atualize a tela e tente novamente.');

    // Reuse an account only when it has an unexpired invite for this exact resident and condo.
    const now = new Date().toISOString();
    const { data: pendingInvite, error: inviteLookupError } = await admin.from('convites_acesso')
      .select('id')
      .eq('condominio_id', profile.condominio_id)
      .eq('morador_id', resident.id)
      .eq('email', email)
      .eq('papel', 'morador')
      .is('aceito_em', null)
      .is('revogado_em', null)
      .gt('expira_em', now)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (inviteLookupError) throw new Error('Não foi possível verificar um convite anterior.');

    let userId = '';
    let createdHere = false;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { nome: resident.nome, perfil: 'morador' },
    });
    if (created.user) {
      userId = created.user.id;
      createdHere = true;
      newlyCreatedUserId = userId;
    } else if (createError && /already|registered|exists|duplicate/i.test(createError.message) && pendingInvite) {
      const { data: existingProfile, error: existingProfileError } = await admin.from('profiles')
        .select('id,condominio_id')
        .eq('email', email)
        .maybeSingle();
      if (existingProfileError) throw new Error('Não foi possível validar a conta do convite anterior.');
      if (existingProfile?.condominio_id && existingProfile.condominio_id !== profile.condominio_id) {
        return reply(409, { error: 'Este e-mail já está vinculado a outro condomínio.' });
      }
      userId = existingProfile?.id || '';
      if (!userId) {
        const { data: users, error: listUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listUsersError) throw new Error('Não foi possível localizar a conta do convite anterior.');
        userId = (users.users || []).find((user) => user.email?.toLowerCase() === email)?.id || '';
      }
      if (!userId) return reply(409, { error: 'Já existe uma conta para este e-mail e não foi possível validar o convite antigo. Peça ao morador para entrar ou use outro e-mail.' });
      const { data: existingRoles, error: existingRolesError } = await admin.from('user_roles').select('role').eq('user_id', userId);
      if (existingRolesError) throw new Error('Não foi possível validar os acessos da conta existente.');
      if ((existingRoles || []).length) return reply(409, { error: 'Esta conta já possui acesso ativo. Não foi alterada.' });
      const { error: updateUserError } = await admin.auth.admin.updateUserById(userId, {
        password: initialPassword,
        email_confirm: true,
        user_metadata: { nome: resident.nome, perfil: 'morador', sercon_convite_token: null },
      });
      if (updateUserError) throw new Error('Não foi possível ativar o acesso anterior: ' + updateUserError.message);
    } else {
      return reply(409, { error: createError?.message || 'Não foi possível criar a conta do morador.' });
    }

    try {
      const { data: existingProfile, error: existingProfileError } = await admin.from('profiles').select('id,condominio_id').eq('id', userId).maybeSingle();
      if (existingProfileError) throw new Error('Não foi possível validar o perfil do morador.');
      if (existingProfile?.condominio_id && existingProfile.condominio_id !== profile.condominio_id) throw new Error('Esta conta já está vinculada a outro condomínio.');

      const { error: profileSaveError } = await admin.from('profiles').upsert({ id: userId, nome: resident.nome, email, condominio_id: profile.condominio_id }, { onConflict: 'id' });
      if (profileSaveError) throw new Error('Não foi possível salvar o perfil do morador: ' + profileSaveError.message);

      const { data: existingRoles, error: rolesCheckError } = await admin.from('user_roles').select('role').eq('user_id', userId);
      if (rolesCheckError) throw new Error('Não foi possível validar o acesso do morador.');
      if ((existingRoles || []).length) {
        throw new Error('Esta conta já possui acesso no sistema. Não foi vinculada ao apartamento.');
      }
      const { error: roleSaveError } = await admin.from('user_roles').insert({ user_id: userId, role: 'morador' });
      if (roleSaveError) throw new Error('Não foi possível conceder acesso ao aplicativo: ' + roleSaveError.message);

      const { data: linkedResident, error: linkError } = await admin.from('moradores')
        .update({ user_id: userId, email })
        .eq('id', resident.id)
        .eq('condominio_id', profile.condominio_id)
        .is('user_id', null)
        .select('id')
        .maybeSingle();
      if (linkError) throw new Error('Não foi possível vincular a conta ao apartamento: ' + linkError.message);
      if (!linkedResident) throw new Error('O morador já foi vinculado a outra conta. Atualize a tela e tente novamente.');

      if (pendingInvite) {
        const { error: revokeError } = await admin.from('convites_acesso').update({ revogado_em: now })
          .eq('condominio_id', profile.condominio_id).eq('morador_id', resident.id).eq('email', email)
          .is('aceito_em', null).is('revogado_em', null);
        if (revokeError) throw new Error('Acesso criado, mas não foi possível invalidar o convite anterior.');
      }
    } catch (error) {
      await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'morador');
      await admin.from('moradores').update({ user_id: null }).eq('id', resident.id).eq('condominio_id', profile.condominio_id).eq('user_id', userId);
      if (createdHere) await admin.auth.admin.deleteUser(userId);
      newlyCreatedUserId = '';
      throw error;
    }

    newlyCreatedUserId = '';
    return reply(200, { ok: true, email, userId, inviteSent: false, initialPassword: 'telefone' });
  } catch (error) {
    if (newlyCreatedUserId) {
      const url = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (url && serviceKey) {
        const cleanup = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
        await cleanup.auth.admin.deleteUser(newlyCreatedUserId);
      }
    }
    return reply(500, { error: error instanceof Error ? error.message : 'Erro inesperado.' });
  }
});
