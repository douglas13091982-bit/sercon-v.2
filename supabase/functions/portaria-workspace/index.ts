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
    const roleNames = (roles || []).map((row) => row.role);
    const isStaff = roleNames.includes('porteiro');
    const isSyndic = roleNames.includes('sindico') || roleNames.includes('super_admin');
    if ((!isStaff && !isSyndic) || !profile?.condominio_id) return reply(403, { error: 'Acesso permitido somente à equipe da portaria e ao síndico.' });
    const condoId = profile.condominio_id;
    const body = await request.json();
    const { data: config, error: configError } = await admin.from('portaria_configuracoes').select('habilitada').eq('condominio_id', condoId).maybeSingle();
    if (configError) throw new Error('Não foi possível verificar o módulo Portaria. Aplique a migração da Portaria.');
    if (!config?.habilitada) return reply(403, { error: 'O síndico desabilitou o módulo Portaria.' });

    if (body.action === 'list') {
      const [condo, blocks, units, residents, visitors, providers, vehicles, packages, notices] = await Promise.all([
        admin.from('condominios').select('id,nome').eq('id', condoId).single(),
        admin.from('blocos').select('id,nome').eq('condominio_id', condoId),
        admin.from('unidades').select('id,bloco_id,numero,status').eq('condominio_id', condoId),
        admin.from('moradores').select('unidade_id,nome,telefone').eq('condominio_id', condoId),
        admin.from('visitantes').select('id,unidade_id,nome,documento,entrada_em,saida_em').eq('condominio_id', condoId),
        admin.from('acessos_prestadores').select('id,unidade_id,nome,documento,empresa,servico,autorizado_por,entrada_em,saida_em').eq('condominio_id', condoId),
        admin.from('veiculos_condominio').select('id,unidade_id,placa,modelo,cor,tipo,vaga,entrada_em,saida_em').eq('condominio_id', condoId),
        admin.from('encomendas').select('id,unidade_id,transportadora,chegada_em,retirada_em,avisado_em').eq('condominio_id', condoId),
        admin.from('comunicados').select('id,titulo,conteudo,criado_em').eq('condominio_id', condoId).order('criado_em', { ascending: false }),
      ]);
      const queryErrors = [condo, blocks, units, residents, visitors, providers, vehicles, packages, notices].filter((row) => row.error);
      if (queryErrors.length) throw new Error('Não foi possível carregar os dados da portaria.');
      const blockNames = new Map((blocks.data || []).map((row) => [row.id, row.nome]));
      return reply(200, {
        habilitada: true,
        condominio: condo.data,
        unidades: (units.data || []).map((row) => ({ id: row.id, bloco: blockNames.get(row.bloco_id) || '', numero: row.numero, moradores: (residents.data || []).filter((resident) => resident.unidade_id === row.id) })),
        visitantes: visitors.data || [], prestadores: providers.data || [], veiculos: vehicles.data || [], encomendas: packages.data || [], comunicados: notices.data || [],
      });
    }

    if (body.action !== 'save' || !isStaff) return reply(403, { error: 'Esta ação está disponível somente para a equipe da portaria.' });
    const [blocks, units] = await Promise.all([
      admin.from('blocos').select('id,nome').eq('condominio_id', condoId),
      admin.from('unidades').select('id,numero,bloco_id').eq('condominio_id', condoId),
    ]);
    if (blocks.error || units.error) throw new Error('Não foi possível validar as unidades do condomínio.');
    const blockNames = new Map((blocks.data || []).map((row) => [row.id, row.nome]));
    const unitByLabel = new Map((units.data || []).map((row) => [`${blockNames.get(row.bloco_id) || ''}-${row.numero}`, row]));
    const actorId = authData.user.id;
    const maxRows = 500;
    const rows = (value: unknown) => Array.isArray(value) ? value.slice(0, maxRows) as Array<Record<string, unknown>> : [];
    const unitId = (label: unknown) => unitByLabel.get(String(label || ''))?.id;
    const validIds = async (table: string, incoming: Array<Record<string, unknown>>) => {
      const ids = incoming.map((row) => String(row.id || '')).filter(Boolean);
      if (!ids.length) return;
      const { data, error } = await admin.from(table).select('id,condominio_id').in('id', ids);
      if (error) throw new Error('Não foi possível validar os registros de portaria.');
      if ((data || []).some((row) => row.condominio_id !== condoId)) throw new Error('Um registro enviado pertence a outro condomínio.');
    };
    const visitorsIn = rows(body.visitantes), providersIn = rows(body.prestadores), vehiclesIn = rows(body.veiculos), packagesIn = rows(body.encomendas);
    await Promise.all([
      validIds('visitantes', visitorsIn), validIds('acessos_prestadores', providersIn), validIds('veiculos_condominio', vehiclesIn), validIds('encomendas', packagesIn),
    ]);
    const visitorsOut = visitorsIn.map((row) => ({ id: row.id, condominio_id: condoId, unidade_id: unitId(row.unidade), nome: String(row.nome || '').slice(0, 160), documento: String(row.doc || '').slice(0, 80) || null, tipo: 'visitante', autorizado_por: null, entrada_em: row.entrada || new Date().toISOString(), saida_em: row.saida || null, registrado_por: actorId })).filter((row) => row.unidade_id && row.nome);
    const providersOut = providersIn.map((row) => ({ id: row.id, condominio_id: condoId, unidade_id: unitId(row.unidade), nome: String(row.nome || '').slice(0, 160), documento: String(row.doc || '').slice(0, 80) || null, empresa: String(row.empresa || '').slice(0, 160) || null, servico: String(row.servico || 'Serviço').slice(0, 240), autorizado_por: String(row.autorizado || '').slice(0, 160) || null, entrada_em: row.entrada || new Date().toISOString(), saida_em: row.saida || null, registrado_por: actorId })).filter((row) => row.unidade_id && row.nome);
    const vehiclesOut = vehiclesIn.map((row) => ({ id: row.id, condominio_id: condoId, unidade_id: unitId(row.unidade), placa: String(row.placa || '').slice(0, 12), modelo: String(row.modelo || 'Veículo').slice(0, 120), cor: String(row.cor || '').slice(0, 60) || null, tipo: row.tipo === 'Morador' ? 'morador' : row.tipo === 'Visitante' ? 'visitante' : 'prestador', vaga: String(row.vaga || '').slice(0, 40) || null, entrada_em: row.entrada || null, saida_em: row.saida || null, criado_por: actorId })).filter((row) => row.unidade_id && row.placa);
    const packagesOut = packagesIn.map((row) => ({ id: row.id, condominio_id: condoId, unidade_id: unitId(row.unidade), descricao: 'Encomenda para ' + String(row.unidade || '').slice(0, 40), transportadora: String(row.transp || '').slice(0, 120) || null, chegada_em: row.chegada || new Date().toISOString(), status: row.retirada ? 'retirada' : 'pendente', retirada_em: row.retirada || null, avisado_em: row.avisado || null, registrado_por: actorId })).filter((row) => row.unidade_id);
    for (const [table, data] of [['visitantes', visitorsOut], ['acessos_prestadores', providersOut], ['veiculos_condominio', vehiclesOut], ['encomendas', packagesOut]] as Array<[string, Array<Record<string, unknown>>]>) {
      if (data.length) {
        const { error } = await admin.from(table).upsert(data, { onConflict: 'id' });
        if (error) throw new Error('Não foi possível salvar ' + table + ': ' + error.message);
      }
    }
    return reply(200, { ok: true });
  } catch (error) {
    return reply(500, { error: error instanceof Error ? error.message : 'Erro inesperado.' });
  }
});
