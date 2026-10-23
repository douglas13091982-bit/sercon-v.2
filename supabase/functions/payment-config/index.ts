import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function b64(bytes: Uint8Array) {
  let s = '';
  bytes.forEach((b) => s += String.fromCharCode(b));
  return btoa(s);
}

function unb64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function cipherKey() {
  const secret = Deno.env.get('MP_CREDENTIALS_ENCRYPTION_KEY');
  if (!secret || secret.length < 32) throw new Error('Configure MP_CREDENTIALS_ENCRYPTION_KEY nos secrets das Edge Functions (mínimo 32 caracteres).');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cipherKey(), new TextEncoder().encode(value));
  return 'v1:' + b64(iv) + ':' + b64(new Uint8Array(encrypted));
}

async function decrypt(value: string) {
  const [version, iv, encrypted] = value.split(':');
  if (version !== 'v1' || !iv || !encrypted) throw new Error('Credencial cifrada inválida.');
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await cipherKey(), unb64(encrypted));
  return new TextDecoder().decode(clear);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('Secrets do Supabase não configurados na função.');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return reply(401, { error: 'Faça login novamente.' });
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) return reply(401, { error: 'Sessão inválida.' });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const [{ data: profile, error: profileError }, { data: roles, error: roleError }] = await Promise.all([
      admin.from('profiles').select('condominio_id').eq('id', userData.user.id).maybeSingle(),
      admin.from('user_roles').select('role').eq('user_id', userData.user.id),
    ]);
    if (profileError || roleError) throw new Error('Não foi possível validar o perfil do síndico.');
    if (!(roles || []).some((r) => r.role === 'sindico' || r.role === 'super_admin') || !profile?.condominio_id) {
      return reply(403, { error: 'Somente o síndico do condomínio pode alterar os meios de pagamento.' });
    }
    const condoId = profile.condominio_id;
    const body = await request.json();

    if (body.action === 'get') {
      const [{ data: method, error: methodError }, { data: credentials, error: credentialsError }] = await Promise.all([
        admin.from('meios_pagamento_condominio').select('id,nome,tipo,dados_publicos,instrucoes,ativo').eq('condominio_id', condoId).eq('ativo', true).maybeSingle(),
        admin.from('mercadopago_credenciais').select('public_key,pix_ativo,cartao_ativo,boleto_ativo').eq('condominio_id', condoId).maybeSingle(),
      ]);
      if (methodError || credentialsError) throw new Error('Não foi possível carregar a configuração de pagamento. Aplique a migração de pagamentos.');
      const { data: secretRow, error: secretError } = await admin.from('mercadopago_credenciais').select('condominio_id').eq('condominio_id', condoId).maybeSingle();
      if (secretError) throw new Error('Não foi possível verificar a credencial Mercado Pago.');
      return reply(200, {
        mode: method?.tipo === 'mercadopago' ? 'mercadopago' : method?.tipo === 'pix' ? 'pix' : null,
        method: method || null,
        mercadoPago: credentials ? { publicKey: credentials.public_key, pix: credentials.pix_ativo, cartao: credentials.cartao_ativo, boleto: credentials.boleto_ativo, hasAccessToken: !!secretRow } : { publicKey: '', pix: true, cartao: true, boleto: true, hasAccessToken: !!secretRow },
      });
    }

    if (body.action !== 'save' || !['pix', 'mercadopago'].includes(body.mode)) {
      return reply(400, { error: 'Escolha Pix manual ou Mercado Pago.' });
    }

    let methodType: string;
    let methodName: string;
    let publicData: Record<string, unknown>;
    let instructions: string | null;
    if (body.mode === 'pix') {
      const key = String(body.pixKey || '').trim();
      if (!key) return reply(400, { error: 'Informe a chave Pix do condomínio.' });
      methodType = 'pix';
      methodName = 'Pix manual';
      publicData = { tipoChave: String(body.pixKeyType || 'Chave aleatória'), chave: key, favorecido: String(body.beneficiary || '').trim() };
      instructions = String(body.instructions || '').trim() || 'Faça o Pix e informe o pagamento para a administração conferir.';
    } else {
      const publicKey = String(body.publicKey || '').trim();
      const accessToken = String(body.accessToken || '').trim();
      const enabled = { pix: !!body.pix, cartao: !!body.cartao, boleto: !!body.boleto };
      if (!publicKey) return reply(400, { error: 'Informe a Public Key da aplicação Mercado Pago.' });
      if (!Object.values(enabled).some(Boolean)) return reply(400, { error: 'Ative ao menos uma forma: Pix, cartão ou boleto.' });
      const { data: prior, error: priorError } = await admin.from('mercadopago_credenciais').select('access_token_cifrado').eq('condominio_id', condoId).maybeSingle();
      if (priorError) throw new Error('Não foi possível ler a configuração Mercado Pago.');
      if (!accessToken && !prior?.access_token_cifrado) return reply(400, { error: 'Informe o Access Token do Mercado Pago.' });
      if (accessToken) {
        const check = await fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: 'Bearer ' + accessToken } });
        if (!check.ok) return reply(400, { error: 'O Mercado Pago recusou esse Access Token. Confira se copiou o token de produção ou teste correto.' });
      }
      const accessTokenCipher = accessToken ? await encrypt(accessToken) : prior.access_token_cifrado;
      const { error: saveCredentialsError } = await admin.from('mercadopago_credenciais').upsert({
        condominio_id: condoId,
        access_token_cifrado: accessTokenCipher,
        public_key: publicKey,
        pix_ativo: enabled.pix,
        cartao_ativo: enabled.cartao,
        boleto_ativo: enabled.boleto,
        updated_by: userData.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'condominio_id' });
      if (saveCredentialsError) throw new Error('Não foi possível salvar as credenciais Mercado Pago.');
      methodType = 'mercadopago';
      methodName = 'Mercado Pago';
      publicData = { publicKey, ...enabled };
      instructions = 'O pagamento será processado pelo checkout seguro do Mercado Pago.';
    }

    const { data: current, error: currentError } = await admin.from('meios_pagamento_condominio').select('id').eq('condominio_id', condoId).eq('ativo', true).maybeSingle();
    if (currentError) throw new Error('Não foi possível atualizar o meio ativo.');
    if (current?.id) {
      const { error } = await admin.from('meios_pagamento_condominio').update({ nome: methodName, tipo: methodType, dados_publicos: publicData, instrucoes, ativo: true, updated_at: new Date().toISOString() }).eq('id', current.id).eq('condominio_id', condoId);
      if (error) throw new Error('Não foi possível salvar o meio de pagamento ativo.');
    } else {
      const { error } = await admin.from('meios_pagamento_condominio').insert({ condominio_id: condoId, nome: methodName, tipo: methodType, dados_publicos: publicData, instrucoes, ativo: true, criado_por: userData.user.id });
      if (error) throw new Error('Não foi possível cadastrar o meio de pagamento ativo.');
    }
    return reply(200, { ok: true });
  } catch (error) {
    console.error('payment-config:', error instanceof Error ? error.message : 'unknown error');
    return reply(500, { error: error instanceof Error ? error.message : 'Falha ao configurar os pagamentos.' });
  }
});
