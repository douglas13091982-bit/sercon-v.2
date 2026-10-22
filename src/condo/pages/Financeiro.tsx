// @ts-nocheck
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, CheckCircle2, Droplets, Flame, Save, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { Badge } from "../components/Badge";

const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white";
const labelClass = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";
const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const competenceToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
};
const monthDate = (month, day = 1) => `${month}-${String(day).padStart(2, "0")}`;

export function Financeiro() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const condoId = user?.condominioId ?? "";
  const canManage = user?.role === "sindico" || user?.role === "super_admin";
  const [competencia, setCompetencia] = useState(competenceToday());
  const [totalAgua, setTotalAgua] = useState("");
  const [feedback, setFeedback] = useState("");
  const [formLeitura, setFormLeitura] = useState({ unidadeId: "", tipo: "gas", anterior: "", atual: "" });

  const configQuery = useQuery({
    queryKey: ["financeiro-config", condoId], enabled: !!condoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_financeiras").select("*").eq("condominio_id", condoId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const unidadesQuery = useQuery({
    queryKey: ["financeiro-unidades", condoId], enabled: !!condoId,
    queryFn: async () => {
      const [{ data: unidades, error: e1 }, { data: blocos, error: e2 }, { data: moradores, error: e3 }] = await Promise.all([
        supabase.from("unidades").select("id,numero,bloco_id,status,fracao_ideal,aluguel_mensal,gas_medidor,agua_medidor").eq("condominio_id", condoId).order("numero"),
        supabase.from("blocos").select("id,nome").eq("condominio_id", condoId).order("nome"),
        supabase.from("moradores").select("id,nome,tipo,unidade_id").eq("condominio_id", condoId),
      ]);
      if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
      const blockNames = new Map((blocos ?? []).map(b => [b.id, b.nome]));
      const tenantUnits = new Set((moradores ?? []).filter(m => m.tipo === "inquilino" && m.unidade_id).map(m => m.unidade_id));
      return (unidades ?? []).map(u => ({ ...u, blocoNome: blockNames.get(u.bloco_id) ?? "Bloco", label: `${blockNames.get(u.bloco_id) ?? "Bloco"} · ${u.numero}`, inquilino: tenantUnits.has(u.id) }));
    },
  });
  const cobrancasQuery = useQuery({
    queryKey: ["cobrancas-unidade", condoId, competencia], enabled: !!condoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("cobrancas_unidade").select("*").eq("condominio_id", condoId).eq("competencia", monthDate(competencia)).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const leiturasQuery = useQuery({
    queryKey: ["leituras-consumo", condoId, competencia], enabled: !!condoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("leituras_consumo").select("*").eq("condominio_id", condoId).eq("competencia", monthDate(competencia)).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const config = configQuery.data ?? { taxa_condominio: 0, vencimento_dia: 10, valor_m3_gas: 0, agua_modo: "individual", valor_m3_agua: 0, criterio_rateio_agua: "igual" };
  const unidades = unidadesQuery.data ?? [];
  const cobrancas = cobrancasQuery.data ?? [];
  const leituraRows = leiturasQuery.data ?? [];
  const unidadeLabel = useMemo(() => new Map(unidades.map(u => [u.id, u.label])), [unidades]);
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["financeiro-config", condoId] });
    queryClient.invalidateQueries({ queryKey: ["financeiro-unidades", condoId] });
    queryClient.invalidateQueries({ queryKey: ["cobrancas-unidade", condoId] });
    queryClient.invalidateQueries({ queryKey: ["leituras-consumo", condoId] });
  };

  const [settings, setSettings] = useState(null);
  React.useEffect(() => {
    if (configQuery.data) setSettings({ ...configQuery.data });
    else if (!configQuery.isLoading) setSettings({ ...config });
  }, [configQuery.data, configQuery.isLoading]);
  const editSettings = settings ?? config;

  const saveSettings = useMutation({
    mutationFn: async () => {
      const payload = {
        condominio_id: condoId,
        taxa_condominio: Number(editSettings.taxa_condominio || 0),
        vencimento_dia: Number(editSettings.vencimento_dia || 10),
        valor_m3_gas: Number(editSettings.valor_m3_gas || 0),
        agua_modo: editSettings.agua_modo,
        valor_m3_agua: Number(editSettings.valor_m3_agua || 0),
        criterio_rateio_agua: editSettings.criterio_rateio_agua,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("configuracoes_financeiras").upsert(payload, { onConflict: "condominio_id" });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setFeedback("Configurações financeiras salvas."); },
    onError: () => setFeedback("Não foi possível salvar. Confira se a migração financeira já foi aplicada no banco.")
  });

  const createCharges = useMutation({
    mutationFn: async () => {
      const [year, month] = competencia.split("-").map(Number);
      const due = monthDate(competencia, Number(config.vencimento_dia || 10));
      const eligible = unidades.filter(u => u.status === "ocupado" && u.inquilino);
      if (!eligible.length) throw new Error("Nenhum apartamento ocupado por inquilino foi encontrado.");
      const fixed = eligible.map(u => ({ condominio_id: condoId, unidade_id: u.id, tipo: "condominio", descricao: "Taxa condominial", competencia: monthDate(competencia), valor: Number(config.taxa_condominio), vencimento: due }));
      if (Number(config.taxa_condominio) > 0) {
        const { error } = await supabase.from("cobrancas_unidade").upsert(fixed, { onConflict: "unidade_id,tipo,competencia", ignoreDuplicates: true });
        if (error) throw error;
      }
      if (config.agua_modo === "rateio" && Number(totalAgua) > 0) {
        const splitUnits = unidades.filter(u => u.status === "ocupado");
        const denom = config.criterio_rateio_agua === "fracao_ideal"
          ? splitUnits.reduce((sum, u) => sum + Number(u.fracao_ideal || 0), 0)
          : splitUnits.length;
        if (!denom) throw new Error("Não há apartamentos ocupados com fração ideal cadastrada para fazer o rateio.");
        const waterRows = splitUnits.map(u => ({ condominio_id: condoId, unidade_id: u.id, tipo: "agua", descricao: "Água · rateio do condomínio", competencia: monthDate(competencia), valor: Math.round((Number(totalAgua) * (config.criterio_rateio_agua === "fracao_ideal" ? Number(u.fracao_ideal || 0) : 1) / denom) * 100) / 100, vencimento: due }));
        const { error } = await supabase.from("cobrancas_unidade").upsert(waterRows, { onConflict: "unidade_id,tipo,competencia", ignoreDuplicates: true });
        if (error) throw error;
      }
      // O upsert idempotente permite repetir a ação sem duplicar a cobrança do mês.
      return { units: eligible.length };
    },
    onSuccess: ({ units }) => { invalidate(); setFeedback(`Cobranças da competência geradas para ${units} apartamento(s).`); },
    onError: (e) => setFeedback(e.message || "Não foi possível gerar as cobranças da competência.")
  });

  const saveReading = useMutation({
    mutationFn: async () => {
      const unit = unidades.find(u => u.id === formLeitura.unidadeId);
      if (!unit) throw new Error("Selecione um apartamento.");
      const before = Number(formLeitura.anterior.replace(",", "."));
      const after = Number(formLeitura.atual.replace(",", "."));
      if (!Number.isFinite(before) || !Number.isFinite(after) || before < 0 || after < before) throw new Error("A leitura atual deve ser maior ou igual à leitura anterior.");
      const rate = Number(formLeitura.tipo === "gas" ? config.valor_m3_gas : config.valor_m3_agua);
      if (formLeitura.tipo === "agua" && config.agua_modo === "rateio") throw new Error("A água está configurada por rateio. Informe o total da conta no quadro de rateio.");
      const { data, error } = await supabase.from("leituras_consumo").insert({ condominio_id: condoId, unidade_id: unit.id, tipo: formLeitura.tipo, competencia: monthDate(competencia), leitura_anterior: before, leitura_atual: after, valor_unitario: rate, criado_por: user?.id }).select("id,consumo,valor_total").single();
      if (error) throw error;
      const { error: chargeError } = await supabase.from("cobrancas_unidade").insert({ condominio_id: condoId, unidade_id: unit.id, tipo: formLeitura.tipo, descricao: formLeitura.tipo === "gas" ? "Gás · leitura individual" : "Água · leitura individual", competencia: monthDate(competencia), valor: data.valor_total, vencimento: monthDate(competencia, Number(config.vencimento_dia || 10)), leitura_id: data.id });
      if (chargeError) throw chargeError;
      return data;
    },
    onSuccess: (data) => { invalidate(); setFeedback(`Leitura registrada: ${data.consumo} m³ · ${brl(data.valor_total)}.`); setFormLeitura({ unidadeId: "", tipo: "gas", anterior: "", atual: "" }); },
    onError: (e) => setFeedback(e.code === "23505" ? "Já existe uma leitura ou cobrança desse tipo para o apartamento nesta competência." : e.message || "Não foi possível salvar a leitura.")
  });

  const markPaid = useMutation({
    mutationFn: async (chargeId) => {
      const { error } = await supabase.from("cobrancas_unidade").update({ status: "pago" }).eq("id", chargeId).eq("condominio_id", condoId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => setFeedback("Não foi possível atualizar o status da cobrança.")
  });

  const total = cobrancas.reduce((sum, c) => sum + Number(c.valor), 0);
  const pendente = cobrancas.filter(c => c.status !== "pago").reduce((sum, c) => sum + Number(c.valor), 0);
  const updateSettings = (key, value) => setSettings(current => ({ ...(current ?? config), [key]: value }));

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1><p className="text-gray-500 dark:text-gray-400">Taxas do condomínio, consumos e cobranças por apartamento.</p></div>
      <label className="text-sm text-gray-600 dark:text-gray-300">Competência<input type="month" className={`${inputClass} mt-1`} value={competencia} onChange={e => setCompetencia(e.target.value)} /></label>
    </header>

    {feedback && <div role="status" className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100">{feedback}</div>}
    {(configQuery.isError || unidadesQuery.isError || cobrancasQuery.isError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Falha ao carregar dados financeiros. Confirme a conexão e a migração do módulo.</p>}

    <div className="grid gap-4 sm:grid-cols-3">
      {[{ title: "Cobranças do mês", value: brl(total), icon: Wallet }, { title: "Em aberto", value: brl(pendente), icon: Calculator }, { title: "Apartamentos", value: unidades.length, icon: CheckCircle2 }].map(card => <div key={card.title} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center gap-2 text-sm text-gray-500"><card.icon className="h-4 w-4 text-teal-600" />{card.title}</div><p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p></div>)}
    </div>

    {canManage && <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Regras de cobrança do condomínio</h2><p className="text-sm text-gray-500">Configure valores padrão uma vez. O sistema usa essas regras ao gerar as cobranças mensais.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className={labelClass}>Taxa condominial mensal (R$)</label><input min="0" step="0.01" type="number" className={inputClass} value={editSettings.taxa_condominio ?? 0} onChange={e => updateSettings("taxa_condominio", e.target.value)} /></div>
        <div><label className={labelClass}>Dia do vencimento</label><input min="1" max="28" type="number" className={inputClass} value={editSettings.vencimento_dia ?? 10} onChange={e => updateSettings("vencimento_dia", e.target.value)} /></div>
        <div><label className={labelClass}>Preço do gás por m³ (R$)</label><input min="0" step="0.0001" type="number" className={inputClass} value={editSettings.valor_m3_gas ?? 0} onChange={e => updateSettings("valor_m3_gas", e.target.value)} /></div>
        <div><label className={labelClass}>Como cobrar a água?</label><select className={inputClass} value={editSettings.agua_modo ?? "individual"} onChange={e => updateSettings("agua_modo", e.target.value)}><option value="individual">Leitura individual por apartamento</option><option value="rateio">Ratear a conta do condomínio</option></select></div>
        {editSettings.agua_modo === "individual" ? <div><label className={labelClass}>Preço da água por m³ (R$)</label><input min="0" step="0.0001" type="number" className={inputClass} value={editSettings.valor_m3_agua ?? 0} onChange={e => updateSettings("valor_m3_agua", e.target.value)} /></div> : <div><label className={labelClass}>Critério do rateio</label><select className={inputClass} value={editSettings.criterio_rateio_agua ?? "igual"} onChange={e => updateSettings("criterio_rateio_agua", e.target.value)}><option value="igual">Mesmo valor por apartamento ocupado</option><option value="fracao_ideal">Proporcional à fração ideal</option></select></div>}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3"><button disabled={saveSettings.isPending} onClick={() => saveSettings.mutate()} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"><Save className="h-4 w-4" />{saveSettings.isPending ? "Salvando..." : "Salvar regras"}</button><button disabled={createCharges.isPending || !configQuery.data} onClick={() => createCharges.mutate()} className="rounded-lg border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50 dark:border-teal-800 dark:text-teal-300">Gerar cobranças de {competencia.split("-").reverse().join("/")}</button></div>
      <p className="mt-3 text-xs text-gray-500">A geração é segura para repetir: cobranças existentes na mesma competência não são duplicadas. A taxa condominial é aplicada aos apartamentos ocupados com inquilino cadastrado.</p>
    </section>}

    {canManage && <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-start gap-3"><Flame className="mt-1 h-5 w-5 text-orange-500" /><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leituras individuais</h2><p className="text-sm text-gray-500">Registre o consumo do gás ou da água por apartamento. O sistema calcula consumo e valor.</p></div></div>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={e => { e.preventDefault(); saveReading.mutate(); }}>
        <div className="lg:col-span-1"><label className={labelClass}>Apartamento</label><select required className={inputClass} value={formLeitura.unidadeId} onChange={e => setFormLeitura({ ...formLeitura, unidadeId: e.target.value })}><option value="">Selecione</option>{unidades.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select></div>
        <div><label className={labelClass}>Medidor</label><select className={inputClass} value={formLeitura.tipo} onChange={e => setFormLeitura({ ...formLeitura, tipo: e.target.value })}><option value="gas">Gás</option>{config.agua_modo === "individual" && <option value="agua">Água</option>}</select></div>
        <div><label className={labelClass}>Leitura anterior (m³)</label><input required type="number" min="0" step="0.001" className={inputClass} value={formLeitura.anterior} onChange={e => setFormLeitura({ ...formLeitura, anterior: e.target.value })} /></div>
        <div><label className={labelClass}>Leitura atual (m³)</label><input required type="number" min="0" step="0.001" className={inputClass} value={formLeitura.atual} onChange={e => setFormLeitura({ ...formLeitura, atual: e.target.value })} /></div>
        <button disabled={saveReading.isPending || !configQuery.data} className="self-end rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saveReading.isPending ? "Salvando..." : "Registrar leitura"}</button>
      </form>
    </section>}

    {canManage && config.agua_modo === "rateio" && <section className="rounded-xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40">
      <div className="mb-3 flex items-center gap-2"><Droplets className="h-5 w-5 text-blue-600" /><h2 className="font-semibold text-gray-900 dark:text-white">Rateio da conta de água</h2></div>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">Informe o valor total da fatura de água. O sistema divide entre apartamentos ocupados pelo critério configurado.</p>
      <div className="flex flex-wrap items-end gap-3"><div><label className={labelClass}>Total da fatura (R$)</label><input min="0.01" step="0.01" type="number" className={inputClass} value={totalAgua} onChange={e => setTotalAgua(e.target.value)} /></div><button disabled={!totalAgua || createCharges.isPending || !configQuery.data} onClick={() => createCharges.mutate()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Ratear água nesta competência</button></div>
    </section>}

    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-100 p-5 dark:border-gray-700"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cobranças · {competencia.split("-").reverse().join("/")}</h2><p className="text-sm text-gray-500">Cada lançamento fica vinculado ao apartamento e pode ser acompanhado pelo morador.</p></div>
      {cobrancasQuery.isLoading ? <p className="p-5 text-sm text-gray-500">Carregando cobranças...</p> : cobrancas.length === 0 ? <p className="p-5 text-sm text-gray-500">Nenhuma cobrança gerada para esta competência.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700/50"><tr><th className="px-5 py-3">Apartamento</th><th className="px-5 py-3">Descrição</th><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Status</th>{canManage && <th className="px-5 py-3">Ação</th>}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{cobrancas.map(c => <tr key={c.id}><td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{unidadeLabel.get(c.unidade_id) ?? "Apartamento"}</td><td className="px-5 py-3 text-gray-600 dark:text-gray-300">{c.descricao}</td><td className="px-5 py-3 text-gray-600 dark:text-gray-300">{new Date(`${c.vencimento}T12:00:00`).toLocaleDateString("pt-BR")}</td><td className="px-5 py-3 font-semibold">{brl(c.valor)}</td><td className="px-5 py-3"><Badge variant={c.status === "pago" ? "success" : "warning"}>{c.status === "pago" ? "Pago" : "Pendente"}</Badge></td>{canManage && <td className="px-5 py-3">{c.status !== "pago" && <button onClick={() => markPaid.mutate(c.id)} className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-300">Marcar como pago</button>}</td>}</tr>)}</tbody></table></div>}
    </section>

    {canManage && <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Leituras registradas</h2>{leituraRows.length === 0 ? <p className="text-sm text-gray-500">Nenhuma leitura lançada nesta competência.</p> : <div className="grid gap-3 md:grid-cols-2">{leituraRows.map(l => <div key={l.id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50"><p className="font-medium text-gray-900 dark:text-white">{unidadeLabel.get(l.unidade_id) ?? "Apartamento"} · {l.tipo === "gas" ? "Gás" : "Água"}</p><p className="text-sm text-gray-600 dark:text-gray-300">{l.leitura_anterior} → {l.leitura_atual} m³ · consumo {l.consumo} m³ · {brl(l.valor_total)}</p></div>)}</div>}</section>}
  </div>;
}
