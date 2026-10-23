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
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return reply(401, { error: 'Faça login novamente.' });
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return reply(401, { error: 'Sessão inválida.' });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      admin.from('profiles').select('condominio_id').eq('id', authData.user.id).maybeSingle(),
      admin.from('user_roles').select('role').eq('user_id', authData.user.id),
    ]);
    if (profileError || rolesError) throw new Error('Não foi possível validar o perfil.');
    const isSyndic = (roles || []).some((row) => row.role === 'sindico' || row.role === 'super_admin');
    if (!isSyndic || !profile?.condominio_id) return reply(403, { error: 'Somente o síndico pode administrar a equipe da portaria.' });
    const condoId = profile.condominio_id;
    const body = await request.json();

    if (body.action === 'get') {
      const [{ data: config, error: configError }, { data: profileRows, error: listError }] = await Promise.all([
        admin.from('portaria_configuracoes').select('habilitada').eq('condominio_id', condoId).maybeSingle(),
        admin.from('profiles').select('id,nome,email').eq('condominio_id', condoId),
      ]);
      if (configError || listError) throw new Error('Não foi possível carregar a equipe. Aplique a migração da Portaria.');
      const profileIds = (profileRows || []).map((row) => row.id);
      let team: Array<{ id: string; nome: string; email: string; status: string }> = [];
      if (profileIds.length) {
        const { data: rolesRows, error: rolesListError } = await admin.from('user_roles').select('user_id').eq('role', 'porteiro').in('user_id', profileIds);
        if (rolesListError) throw new Error('Não foi possível carregar os acessos da portaria.');
        const activeIds = new Set((rolesRows || []).map((row) => row.user_id));
        team = (profileRows || []).filter((row) => activeIds.has(row.id)).map((row) => ({ id: row.id, nome: row.nome || '', email: row.email || '', status: 'Acesso ativo' }));
      }
      return reply(200, { habilitada: !!config?.habilitada, equipe: team });
    }

    if (body.action === 'set-enabled') {
      const { error } = await admin.from('portaria_configuracoes').upsert({ condominio_id: condoId, habilitada: !!body.enabled, updated_by: authData.user.id, updated_at: new Date().toISOString() }, { onConflict: 'condominio_id' });
      if (error) throw new Error('Não foi possível salvar a ativação da Portaria: ' + error.message);
      return reply(200, { habilitada: !!body.enabled });
    }

    if (body.action === 'invite') {
      const { data: config, error: configError } = await admin.from('portaria_configuracoes').select('habilitada').eq('condominio_id', condoId).maybeSingle();
      if (configError) throw new Error('Não foi possível verificar o módulo Portaria.');
      if (!config?.habilitada) return reply(409, { error: 'Habilite o módulo Portaria antes de convidar a equipe.' });
      const nome = String(body.nome || '').trim().slice(0, 120);
      const email = String(body.email || '').trim().toLowerCase();
      if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'Informe um nome e um e-mail válidos.' });

      const { data: existingProfile, error: existingError } = await admin.from('profiles').select('id,condominio_id').eq('email', email).maybeSingle();
      if (existingError) throw new Error('Não foi possível verificar o e-mail informado.');
      let userId: string;
      let inviteSent = false;
      if (existingProfile) {
        if (existingProfile.condominio_id && existingProfile.condominio_id !== condoId) return reply(409, { error: 'Este e-mail já está vinculado a outro condomínio.' });
        userId = existingProfile.id;
        const { data: existingRoles, error: existingRolesError } = await admin.from('user_roles').select('role').eq('user_id', userId);
        if (existingRolesError) throw new Error('Não foi possível verificar os acessos já existentes.');
        if ((existingRoles || []).length) return reply(409, { error: 'Este e-mail já possui acesso no sistema. Use a conta existente ou informe outro e-mail.' });
        const { error: profileUpdateError } = await admin.from('profiles').update({ nome, condominio_id: condoId }).eq('id', userId);
        if (profileUpdateError) throw new Error('Não foi possível vincular o perfil do profissional.');
      } else {
        const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { nome } });
        if (inviteError || !invited.user) return reply(400, { error: inviteError?.message || 'Não foi possível enviar o convite.' });
        userId = invited.user.id;
        inviteSent = true;
        const { error: profileUpsertError } = await admin.from('profiles').upsert({ id: userId, nome, email, condominio_id: condoId }, { onConflict: 'id' });
        if (profileUpsertError) throw new Error('O convite foi criado, mas não foi possível vincular o perfil.');
      }
      const { error: roleInsertError } = await admin.from('user_roles').insert({ user_id: userId, role: 'porteiro' });
      if (roleInsertError) throw new Error('Não foi possível conceder acesso à portaria: ' + roleInsertError.message);
      return reply(200, { ok: true, inviteSent });
    }

    if (body.action === 'remove') {
      const userId = String(body.userId || '');
      const { data: staffProfile, error: staffError } = await admin.from('profiles').select('id').eq('id', userId).eq('condominio_id', condoId).maybeSingle();
      if (staffError) throw new Error('Não foi possível validar o profissional.');
      if (!staffProfile) return reply(404, { error: 'Profissional não encontrado neste condomínio.' });
      const { error } = await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'porteiro');
      if (error) throw new Error('Não foi possível remover o acesso.');
      return reply(200, { ok: true });
    }
    return reply(400, { error: 'Ação não reconhecida.' });
  } catch (error) {
    return reply(500, { error: error instanceof Error ? error.message : 'Erro inesperado.' });
  }
});
