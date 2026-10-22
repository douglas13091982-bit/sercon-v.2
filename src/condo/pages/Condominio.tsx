import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, MapPin, Phone, Mail, Edit2, Trash2, Pencil, Users, FileText, Upload, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";

type CondominioRow = Tables<"condominios">;
type BlocoRow = Tables<"blocos">;
type UnidadeRow = Tables<"unidades">;
type StatusUnidade = "ocupado" | "vago" | "venda";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const btnPrimary =
  "px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg";
const btnGhost =
  "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg";

const statusLabel: Record<
  StatusUnidade,
  { label: string; variant: "success" | "warning" | "info" }
> = {
  ocupado: { label: "Ocupado", variant: "success" },
  vago: { label: "Vago", variant: "warning" },
  venda: { label: "À venda", variant: "info" },
};

function infoStatus(status: string) {
  return statusLabel[status as StatusUnidade] ?? statusLabel.vago;
}

const numeroOuNull = (v: string): number | null => {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
};

function mensagemErro(e: { code?: string }, padrao: string): string {
  if (e.code === "23505") return "Já existe um registro com esse nome/número.";
  if (e.code === "23503")
    return "Existem moradores vinculados. Remova ou mova os moradores antes de excluir.";
  return padrao;
}

export function Condominio() {
  const { user, recarregarPerfil } = useAuth();
  const queryClient = useQueryClient();
  const condominioId = user?.condominioId ?? "";
  const isSuperAdmin = user?.role === "super_admin";
  const podeEditar = user?.role === "sindico";

  const [tab, setTab] = useState<"info" | "blocos" | "unidades">("info");

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["condominio"] });
    queryClient.invalidateQueries({ queryKey: ["blocos", condominioId] });
    queryClient.invalidateQueries({ queryKey: ["unidades", condominioId] });
    queryClient.invalidateQueries({ queryKey: ["unidades-select", condominioId] });
  };

  // ───────── Super admin: lista de condomínios clientes ─────────
  const todosQuery = useQuery({
    queryKey: ["condominio", "todos"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("condominios").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  // ───────── Condomínio do síndico ─────────
  const condominioQuery = useQuery({
    queryKey: ["condominio", condominioId],
    enabled: !!condominioId && !isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("*")
        .eq("id", condominioId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const blocosQuery = useQuery({
    queryKey: ["blocos", condominioId],
    enabled: !!condominioId && !isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocos")
        .select("*")
        .eq("condominio_id", condominioId)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const unidadesQuery = useQuery({
    queryKey: ["unidades", condominioId],
    enabled: !!condominioId && !isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("*")
        .eq("condominio_id", condominioId)
        .order("numero");
      if (error) throw error;
      return data;
    },
  });

  const moradoresQuery = useQuery({
    queryKey: ["moradores", condominioId],
    enabled: !!condominioId && !isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moradores")
        .select("id,nome,tipo,unidade_id,email")
        .eq("condominio_id", condominioId)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const condominio = condominioQuery.data ?? null;
  const blocos = blocosQuery.data ?? [];
  const unidades = unidadesQuery.data ?? [];
  const moradores = moradoresQuery.data ?? [];

  // ───────── Dados do condomínio ─────────
  const [editandoDados, setEditandoDados] = useState(false);
  const [dados, setDados] = useState({ nome: "", cnpj: "", endereco: "", telefone: "", email: "" });
  const [erroDados, setErroDados] = useState("");

  const abrirDados = (c: CondominioRow) => {
    setDados({
      nome: c.nome,
      cnpj: c.cnpj ?? "",
      endereco: c.endereco ?? "",
      telefone: c.telefone ?? "",
      email: c.email ?? "",
    });
    setErroDados("");
    setEditandoDados(true);
  };

  const salvarDados = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("condominios")
        .update({
          nome: dados.nome.trim(),
          cnpj: dados.cnpj.trim() || null,
          endereco: dados.endereco.trim() || null,
          telefone: dados.telefone.trim() || null,
          email: dados.email.trim() || null,
        })
        .eq("id", condominioId)
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      setEditandoDados(false);
      void recarregarPerfil(); // atualiza o nome exibido no cabeçalho
    },
    onError: () => setErroDados("Não foi possível salvar. Tente novamente."),
  });

  // ───────── Blocos ─────────
  const [blocoModal, setBlocoModal] = useState(false);
  const [blocoEditId, setBlocoEditId] = useState<string | null>(null);
  const [blocoNome, setBlocoNome] = useState("");
  const [erroBloco, setErroBloco] = useState("");

  const salvarBloco = useMutation({
    mutationFn: async () => {
      const nome = blocoNome.trim();
      const { error } = blocoEditId
        ? await supabase
            .from("blocos")
            .update({ nome })
            .eq("condominio_id", condominioId)
            .eq("id", blocoEditId)
            .select("id")
            .single()
        : await supabase.from("blocos").insert({ nome, condominio_id: condominioId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      setBlocoModal(false);
    },
    onError: (e: { code?: string }) =>
      setErroBloco(mensagemErro(e, "Não foi possível salvar o bloco.")),
  });

  const excluirBloco = useMutation({
    mutationFn: async (id: string) => {
      const { data: contratos } = await supabase
        .from("unidades")
        .select("contrato_storage_path")
        .eq("condominio_id", condominioId)
        .eq("bloco_id", id)
        .not("contrato_storage_path", "is", null);
      const { error } = await supabase
        .from("blocos")
        .delete()
        .eq("condominio_id", condominioId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      const paths = (contratos ?? []).flatMap((row) => row.contrato_storage_path ? [row.contrato_storage_path] : []);
      if (paths.length) await supabase.storage.from("contratos-locacao").remove(paths);
    },
    onSuccess: invalidar,
    onError: (e: { code?: string }) =>
      window.alert(mensagemErro(e, "Não foi possível excluir o bloco.")),
  });

  const abrirBloco = (b?: BlocoRow) => {
    setBlocoEditId(b?.id ?? null);
    setBlocoNome(b?.nome ?? "");
    setErroBloco("");
    setBlocoModal(true);
  };

  const confirmarExclusaoBloco = (b: BlocoRow) => {
    const qtd = unidades.filter((u) => u.bloco_id === b.id).length;
    const aviso = qtd > 0 ? ` Suas ${qtd} unidade(s) também serão excluídas.` : "";
    if (window.confirm(`Excluir "${b.nome}"?${aviso} Esta ação não pode ser desfeita.`))
      excluirBloco.mutate(b.id);
  };

  const abrirContrato = async (u: UnidadeRow) => {
    if (!u.contrato_storage_path) return;
    const { data, error } = await supabase.storage.from("contratos-locacao").createSignedUrl(u.contrato_storage_path, 60);
    if (error || !data?.signedUrl) {
      window.alert("Não foi possível abrir o contrato.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  // ───────── Unidades ─────────
  const formUnidadeVazio = {
    blocoId: "",
    numero: "",
    andar: "",
    metragem: "",
    fracao: "",
    aluguel: "",
    contratoInicio: "",
    contratoFim: "",
    status: "vago" as StatusUnidade,
  };
  const [unidadeModal, setUnidadeModal] = useState(false);
  const [unidadeEditId, setUnidadeEditId] = useState<string | null>(null);
  const [formUnidade, setFormUnidade] = useState(formUnidadeVazio);
  const [erroUnidade, setErroUnidade] = useState("");
  const [arquivoContrato, setArquivoContrato] = useState<File | null>(null);
  const [contratoPathAtual, setContratoPathAtual] = useState("");
  const [contratoNomeAtual, setContratoNomeAtual] = useState("");

  const abrirUnidade = (u?: UnidadeRow) => {
    setUnidadeEditId(u?.id ?? null);
    setFormUnidade(
      u
        ? {
            blocoId: u.bloco_id,
            numero: u.numero,
            andar: u.andar?.toString() ?? "",
            metragem: u.metragem?.toString() ?? "",
            fracao: u.fracao_ideal?.toString() ?? "",
            aluguel: u.aluguel_mensal?.toString() ?? "",
            contratoInicio: u.contrato_inicio ?? "",
            contratoFim: u.contrato_fim ?? "",
            status: (u.status as StatusUnidade) ?? "vago",
          }
        : { ...formUnidadeVazio, blocoId: blocos[0]?.id ?? "" },
    );
    setArquivoContrato(null);
    setContratoPathAtual(u?.contrato_storage_path ?? "");
    setContratoNomeAtual(u?.contrato_nome ?? "");
    setErroUnidade("");
    setUnidadeModal(true);
  };

  const salvarUnidade = useMutation({
    mutationFn: async () => {
      const f = formUnidade;
      const aluguel = numeroOuNull(f.aluguel);
      if (f.aluguel.trim() && (aluguel === null || aluguel < 0))
        throw new Error("Informe um valor de aluguel válido.");
      if (f.contratoInicio && f.contratoFim && f.contratoFim < f.contratoInicio)
        throw new Error("A data final do contrato deve ser posterior à data inicial.");
      const dadosUnidade = {
        bloco_id: f.blocoId,
        numero: f.numero.trim(),
        andar: numeroOuNull(f.andar),
        metragem: numeroOuNull(f.metragem),
        fracao_ideal: numeroOuNull(f.fracao),
        aluguel_mensal: aluguel,
        contrato_inicio: f.contratoInicio || null,
        contrato_fim: f.contratoFim || null,
        status: f.status,
      };
      const saved = unidadeEditId
        ? await supabase
            .from("unidades")
            .update(dadosUnidade)
            .eq("condominio_id", condominioId)
            .eq("id", unidadeEditId)
            .select("id")
            .single()
        : await supabase.from("unidades").insert({ ...dadosUnidade, condominio_id: condominioId }).select("id").single();
      if (saved.error) throw saved.error;
      if (arquivoContrato) {
        const path = `${condominioId}/${saved.data.id}/${Date.now()}-${arquivoContrato.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("contratos-locacao").upload(path, arquivoContrato, { contentType: arquivoContrato.type, upsert: false });
        if (uploadError) throw uploadError;
        const { error: metadataError } = await supabase.from("unidades").update({ contrato_storage_path: path, contrato_nome: arquivoContrato.name }).eq("condominio_id", condominioId).eq("id", saved.data.id);
        if (metadataError) {
          await supabase.storage.from("contratos-locacao").remove([path]);
          throw metadataError;
        }
        if (contratoPathAtual) await supabase.storage.from("contratos-locacao").remove([contratoPathAtual]);
      }
    },
    onSuccess: () => {
      invalidar();
      setUnidadeModal(false);
    },
    onError: (e: { code?: string; message?: string }) =>
      setErroUnidade(
        e.message ??
          (e.code === "23505"
            ? "Já existe uma unidade com esse número neste bloco."
            : mensagemErro(e, "Não foi possível salvar a unidade.")),
      ),
  });

  const excluirUnidade = useMutation({
    mutationFn: async (id: string) => {
      const { data: unidade } = await supabase
        .from("unidades")
        .select("contrato_storage_path")
        .eq("condominio_id", condominioId)
        .eq("id", id)
        .maybeSingle();
      const { error } = await supabase
        .from("unidades")
        .delete()
        .eq("condominio_id", condominioId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      if (unidade?.contrato_storage_path)
        await supabase.storage.from("contratos-locacao").remove([unidade.contrato_storage_path]);
    },
    onSuccess: invalidar,
    onError: (e: { code?: string }) =>
      window.alert(mensagemErro(e, "Não foi possível excluir a unidade.")),
  });

  const enviarUnidade = (e: React.FormEvent) => {
    e.preventDefault();
    setErroUnidade("");
    if (!formUnidade.blocoId) return setErroUnidade("Cadastre um bloco antes de criar unidades.");
    if (!formUnidade.numero.trim()) return setErroUnidade("Informe o número da unidade.");
    const andar = numeroOuNull(formUnidade.andar);
    const metragem = numeroOuNull(formUnidade.metragem);
    const fracao = numeroOuNull(formUnidade.fracao);
    if (formUnidade.andar.trim() && (andar === null || !Number.isInteger(andar)))
      return setErroUnidade("Informe um andar inteiro.");
    if (
      formUnidade.metragem.trim() &&
      (metragem === null || !Number.isFinite(metragem) || metragem <= 0)
    )
      return setErroUnidade("Informe uma metragem maior que zero.");
    if (
      formUnidade.fracao.trim() &&
      (fracao === null || !Number.isFinite(fracao) || fracao <= 0 || fracao > 100)
    )
      return setErroUnidade("A fração ideal deve ser maior que zero e no máximo 100%.");
    salvarUnidade.mutate();
  };

  const enviarBloco = (e: React.FormEvent) => {
    e.preventDefault();
    setErroBloco("");
    if (!blocoNome.trim()) return setErroBloco("Informe o nome do bloco.");
    salvarBloco.mutate();
  };

  const enviarDados = (e: React.FormEvent) => {
    e.preventDefault();
    setErroDados("");
    if (!dados.nome.trim()) return setErroDados("Informe o nome do condomínio.");
    salvarDados.mutate();
  };

  // ───────── Super admin ─────────
  if (isSuperAdmin) {
    const lista = todosQuery.data ?? [];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Condomínios</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Condomínios clientes cadastrados na plataforma
          </p>
        </div>
        {todosQuery.isError && (
          <p className="text-sm text-red-500">Não foi possível carregar os condomínios.</p>
        )}
        <div className="space-y-3">
          {lista.length === 0 && !todosQuery.isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum condomínio cadastrado ainda.
            </p>
          )}
          {lista.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{c.nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {c.cnpj ? `CNPJ ${c.cnpj} • ` : ""}Desde{" "}
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ───────── Síndico / demais papéis ─────────
  const novoLabel = tab === "blocos" ? "Novo Bloco" : tab === "unidades" ? "Nova Unidade" : "";
  const passosSetup = [
    { titulo: "Condomínio", pronto: !!condominio, abrir: () => setTab("info" as const) },
    { titulo: "Blocos", pronto: blocos.length > 0, abrir: () => setTab("blocos" as const) },
    { titulo: "Apartamentos", pronto: unidades.length > 0, abrir: () => setTab("unidades" as const) },
    { titulo: "Moradores", pronto: moradores.length > 0, abrir: () => {} },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Condomínio</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie blocos, unidades e dados do condomínio
          </p>
        </div>
        {podeEditar && novoLabel && (
          <button
            onClick={() => (tab === "blocos" ? abrirBloco() : abrirUnidade())}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> {novoLabel}
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(["info", "blocos", "unidades"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t === "info" ? "Dados" : t === "blocos" ? "Blocos" : "Unidades"}
          </button>
        ))}
      </div>

      {podeEditar && <section className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 dark:border-teal-900 dark:bg-teal-950/30">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-gray-900 dark:text-white">Primeiros passos</h2><p className="text-sm text-gray-600 dark:text-gray-300">Cadastre o condomínio, organize os apartamentos e vincule os moradores.</p></div><span className="text-xs font-medium text-teal-800 dark:text-teal-200">{passosSetup.filter((s) => s.pronto).length} de 4 concluídos</span></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{passosSetup.map((step, index) => <div key={step.titulo} className={`flex items-center gap-3 rounded-lg border bg-white px-3 py-2 dark:bg-gray-800 ${step.pronto ? "border-teal-200 dark:border-teal-800" : "border-gray-200 dark:border-gray-700"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.pronto ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"}`}>{step.pronto ? "✓" : index + 1}</span>{step.titulo === "Moradores" ? <Link to="/$page" params={{ page: "moradores" }} className="flex-1 text-sm font-medium text-gray-800 hover:text-teal-700 dark:text-gray-200 dark:hover:text-teal-300">Cadastrar moradores</Link> : <button onClick={step.abrir} className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-teal-700 dark:text-gray-200 dark:hover:text-teal-300">{step.titulo}{step.titulo === "Apartamentos" ? " e contratos" : ""}</button>}</div>)}</div>
      </section>}

      {(condominioQuery.isError || blocosQuery.isError || unidadesQuery.isError || moradoresQuery.isError) && (
        <p className="text-sm text-red-500">
          Não foi possível carregar os dados. Recarregue a página.
        </p>
      )}

      {tab === "info" && condominio && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {condominio.nome}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  CNPJ: {condominio.cnpj || "não informado"}
                </p>
              </div>
            </div>
            {podeEditar && (
              <button
                onClick={() => abrirDados(condominio)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30"
              >
                <Edit2 className="w-4 h-4" /> Editar
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={<MapPin className="w-4 h-4" />}
              label="Endereço"
              value={condominio.endereco || "não informado"}
            />
            <InfoItem
              icon={<Phone className="w-4 h-4" />}
              label="Telefone"
              value={condominio.telefone || "não informado"}
            />
            <InfoItem
              icon={<Mail className="w-4 h-4" />}
              label="E-mail"
              value={condominio.email || "não informado"}
            />
            <InfoItem
              icon={<Building2 className="w-4 h-4" />}
              label="Total de Unidades"
              value={String(unidades.length)}
            />
          </div>
        </div>
      )}

      {tab === "blocos" && (
        <>
          {blocos.length === 0 && !blocosQuery.isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum bloco cadastrado.
              {podeEditar
                ? ' Clique em "Novo Bloco" para começar (use um único bloco se o condomínio não tiver divisões).'
                : ""}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blocos.map((bloco) => {
              const doBloco = unidades.filter((u) => u.bloco_id === bloco.id);
              const ocupadas = doBloco.filter((u) => u.status === "ocupado").length;
              return (
                <div
                  key={bloco.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {bloco.nome}
                    </h3>
                    {podeEditar && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => abrirBloco(bloco)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label="Renomear bloco"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => confirmarExclusaoBloco(bloco)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label="Excluir bloco"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {doBloco.length}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Unidades</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{ocupadas}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ocupadas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {doBloco.length - ocupadas}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Livres</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "unidades" && (
        <div>
          {blocos.length === 0 && (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-500 dark:bg-gray-800">
              Cadastre um bloco para começar a organizar os apartamentos.
            </p>
          )}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {blocos.map((bloco) => {
              const doBloco = unidades.filter((u) => u.bloco_id === bloco.id);
              return (
                <section key={bloco.id} className="w-[290px] min-w-[290px] rounded-xl bg-gray-100 p-3 dark:bg-gray-800/70">
                  <header className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{bloco.nome}</h3>
                    <Badge variant="neutral">{doBloco.length} apto(s)</Badge>
                  </header>
                  <div className="space-y-3">
                    {doBloco.map((u) => {
                      const residentes = moradores.filter((m) => m.unidade_id === u.id);
                      const status = infoStatus(u.status);
                      return (
                        <article key={u.id} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                          <div className="flex items-start justify-between gap-2">
                            <div><p className="text-lg font-bold text-gray-900 dark:text-white">Apartamento {u.numero}</p><p className="text-xs text-gray-500 dark:text-gray-400">{u.andar != null ? `${u.andar}º andar · ` : ""}{u.metragem != null ? `${u.metragem} m²` : "Unidade"}</p></div>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          {u.aluguel_mensal != null && <div className="mt-3 rounded-md bg-teal-50 px-3 py-2 dark:bg-teal-900/20"><p className="text-xs text-teal-700 dark:text-teal-300">Aluguel mensal</p><p className="font-semibold text-teal-800 dark:text-teal-200">{Number(u.aluguel_mensal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>}
                          {(u.contrato_inicio || u.contrato_fim) && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Contrato: {u.contrato_inicio ? new Date(`${u.contrato_inicio}T00:00:00`).toLocaleDateString("pt-BR") : "—"} até {u.contrato_fim ? new Date(`${u.contrato_fim}T00:00:00`).toLocaleDateString("pt-BR") : "—"}</p>}
                          <div className="mt-3"><p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"><Users className="h-3.5 w-3.5" /> Moradores ({residentes.length})</p>{residentes.length ? <ul className="space-y-1">{residentes.map((m) => <li key={m.id} className="flex items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-300"><span className="truncate">{m.nome}</span><span className="text-xs text-gray-400">{m.tipo === "inquilino" ? "Inquilino" : m.tipo === "proprietario" ? "Proprietário" : "Dependente"}</span></li>)}</ul> : <p className="text-sm text-gray-400">Nenhum morador cadastrado</p>}</div>
                          {podeEditar && u.contrato_storage_path && <button onClick={() => void abrirContrato(u)} className="mt-3 flex w-full items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"><FileText className="h-4 w-4 text-teal-600" /><span className="flex-1 truncate">{u.contrato_nome || "Contrato de aluguel"}</span><ExternalLink className="h-3.5 w-3.5" /></button>}
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                            {podeEditar && <button onClick={() => abrirUnidade(u)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-900/30"><Pencil className="h-3.5 w-3.5" /> Editar</button>}
                            {podeEditar && <button onClick={() => window.confirm(`Excluir o apartamento ${u.numero}? Esta ação não pode ser desfeita.`) && excluirUnidade.mutate(u.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>}
                            <Link to="/$page" params={{ page: "moradores" }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><Users className="h-3.5 w-3.5" /> Gerenciar moradores</Link>
                          </div>
                        </article>
                      );
                    })}
                    {doBloco.length === 0 && <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-gray-600">Nenhum apartamento neste bloco.</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* Dados do condomínio */}
      <Modal
        open={editandoDados}
        onClose={() => setEditandoDados(false)}
        title="Editar dados do condomínio"
        size="lg"
      >
        <form onSubmit={enviarDados} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Nome *</label>
              <input
                className={inputClass}
                value={dados.nome}
                onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>CNPJ</label>
              <input
                className={inputClass}
                value={dados.cnpj}
                onChange={(e) => setDados({ ...dados, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                className={inputClass}
                value={dados.telefone}
                onChange={(e) => setDados({ ...dados, telefone: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Endereço</label>
              <input
                className={inputClass}
                value={dados.endereco}
                onChange={(e) => setDados({ ...dados, endereco: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>E-mail</label>
              <input
                type="email"
                className={inputClass}
                value={dados.email}
                onChange={(e) => setDados({ ...dados, email: e.target.value })}
              />
            </div>
          </div>
          {erroDados && <p className="text-sm text-red-500">{erroDados}</p>}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setEditandoDados(false)} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" disabled={salvarDados.isPending} className={btnPrimary}>
              {salvarDados.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bloco */}
      <Modal
        open={blocoModal}
        onClose={() => setBlocoModal(false)}
        title={blocoEditId ? "Renomear bloco" : "Novo bloco"}
        size="sm"
      >
        <form onSubmit={enviarBloco} className="space-y-4">
          <div>
            <label className={labelClass}>Nome do bloco *</label>
            <input
              className={inputClass}
              value={blocoNome}
              onChange={(e) => setBlocoNome(e.target.value)}
              placeholder="Ex: Bloco A"
              autoFocus
            />
          </div>
          {erroBloco && <p className="text-sm text-red-500">{erroBloco}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBlocoModal(false)} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" disabled={salvarBloco.isPending} className={btnPrimary}>
              {salvarBloco.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Unidade */}
      <Modal
        open={unidadeModal}
        onClose={() => setUnidadeModal(false)}
        title={unidadeEditId ? "Editar unidade" : "Nova unidade"}
        size="lg"
      >
        <form onSubmit={enviarUnidade} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bloco *</label>
              <select
                className={inputClass}
                value={formUnidade.blocoId}
                onChange={(e) => setFormUnidade({ ...formUnidade, blocoId: e.target.value })}
              >
                {blocos.length === 0 && <option value="">Cadastre um bloco primeiro</option>}
                {blocos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Número *</label>
              <input
                className={inputClass}
                value={formUnidade.numero}
                onChange={(e) => setFormUnidade({ ...formUnidade, numero: e.target.value })}
                placeholder="Ex: 101"
              />
            </div>
            <div>
              <label className={labelClass}>Andar</label>
              <input
                type="number"
                className={inputClass}
                value={formUnidade.andar}
                onChange={(e) => setFormUnidade({ ...formUnidade, andar: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Metragem (m²)</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={formUnidade.metragem}
                onChange={(e) => setFormUnidade({ ...formUnidade, metragem: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Fração ideal (%)</label>
              <input
                type="number"
                step="0.001"
                className={inputClass}
                value={formUnidade.fracao}
                onChange={(e) => setFormUnidade({ ...formUnidade, fracao: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Aluguel mensal (R$)</label>
              <input type="number" min="0" step="0.01" className={inputClass} value={formUnidade.aluguel} onChange={(e) => setFormUnidade({ ...formUnidade, aluguel: e.target.value })} placeholder="Opcional" />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={formUnidade.status}
                onChange={(e) =>
                  setFormUnidade({ ...formUnidade, status: e.target.value as StatusUnidade })
                }
              >
                <option value="vago">Vago</option>
                <option value="ocupado">Ocupado</option>
                <option value="venda">À venda</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Início do contrato</label>
              <input type="date" className={inputClass} value={formUnidade.contratoInicio} onChange={(e) => setFormUnidade({ ...formUnidade, contratoInicio: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Fim do contrato</label>
              <input type="date" className={inputClass} value={formUnidade.contratoFim} onChange={(e) => setFormUnidade({ ...formUnidade, contratoFim: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Contrato de aluguel (PDF, JPG ou PNG · até 10 MB)</label>
              {contratoNomeAtual && !arquivoContrato && <p className="mb-2 flex items-center gap-2 text-xs text-gray-500"><FileText className="h-4 w-4" />Arquivo salvo: {contratoNomeAtual}</p>}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"><Upload className="h-4 w-4" />{arquivoContrato ? arquivoContrato.name : contratoNomeAtual ? "Substituir arquivo" : "Selecionar arquivo"}<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f && f.size > 10 * 1024 * 1024) { setErroUnidade("O contrato deve ter no máximo 10 MB."); e.target.value = ""; return; } setErroUnidade(""); setArquivoContrato(f); }} /></label>
              <p className="mt-1 text-xs text-gray-500">O arquivo fica privado e pode ser acessado pelo síndico do condomínio.</p>
            </div>
          </div>
          {erroUnidade && <p className="text-sm text-red-500">{erroUnidade}</p>}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setUnidadeModal(false)} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" disabled={salvarUnidade.isPending} className={btnPrimary}>
              {salvarUnidade.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <div className="text-teal-600 dark:text-teal-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
