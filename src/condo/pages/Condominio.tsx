import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, MapPin, Phone, Mail, Edit2, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DataTable } from "../components/DataTable";
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

  const condominio = condominioQuery.data ?? null;
  const blocos = blocosQuery.data ?? [];
  const unidades = unidadesQuery.data ?? [];
  const nomeBloco = new Map(blocos.map((b) => [b.id, b.nome]));

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
      const { error } = await supabase
        .from("blocos")
        .delete()
        .eq("condominio_id", condominioId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
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

  // ───────── Unidades ─────────
  const formUnidadeVazio = {
    blocoId: "",
    numero: "",
    andar: "",
    metragem: "",
    fracao: "",
    status: "vago" as StatusUnidade,
  };
  const [unidadeModal, setUnidadeModal] = useState(false);
  const [unidadeEditId, setUnidadeEditId] = useState<string | null>(null);
  const [formUnidade, setFormUnidade] = useState(formUnidadeVazio);
  const [erroUnidade, setErroUnidade] = useState("");

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
            status: (u.status as StatusUnidade) ?? "vago",
          }
        : { ...formUnidadeVazio, blocoId: blocos[0]?.id ?? "" },
    );
    setErroUnidade("");
    setUnidadeModal(true);
  };

  const salvarUnidade = useMutation({
    mutationFn: async () => {
      const f = formUnidade;
      const dadosUnidade = {
        bloco_id: f.blocoId,
        numero: f.numero.trim(),
        andar: numeroOuNull(f.andar),
        metragem: numeroOuNull(f.metragem),
        fracao_ideal: numeroOuNull(f.fracao),
        status: f.status,
      };
      const { error } = unidadeEditId
        ? await supabase
            .from("unidades")
            .update(dadosUnidade)
            .eq("condominio_id", condominioId)
            .eq("id", unidadeEditId)
            .select("id")
            .single()
        : await supabase.from("unidades").insert({ ...dadosUnidade, condominio_id: condominioId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      setUnidadeModal(false);
    },
    onError: (e: { code?: string }) =>
      setErroUnidade(
        e.code === "23505"
          ? "Já existe uma unidade com esse número neste bloco."
          : mensagemErro(e, "Não foi possível salvar a unidade."),
      ),
  });

  const excluirUnidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("unidades")
        .delete()
        .eq("condominio_id", condominioId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
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
  const unidadeColumns = [
    {
      key: "numero",
      header: "Unidade",
      render: (u: UnidadeRow) => <span className="font-medium">{u.numero}</span>,
    },
    {
      key: "bloco_id",
      header: "Bloco",
      render: (u: UnidadeRow) => nomeBloco.get(u.bloco_id) ?? "-",
    },
    { key: "andar", header: "Andar", render: (u: UnidadeRow) => (u.andar ?? "-").toString() },
    {
      key: "metragem",
      header: "m²",
      render: (u: UnidadeRow) => (u.metragem != null ? `${u.metragem} m²` : "-"),
    },
    {
      key: "fracao_ideal",
      header: "Fração Ideal",
      render: (u: UnidadeRow) => (u.fracao_ideal != null ? `${u.fracao_ideal}%` : "-"),
    },
    {
      key: "status",
      header: "Status",
      render: (u: UnidadeRow) => {
        const s = infoStatus(u.status);
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    ...(podeEditar
      ? [
          {
            key: "acoes",
            header: "",
            sortable: false,
            render: (u: UnidadeRow) => (
              <div className="flex gap-1 justify-end">
                <button
                  onClick={() => abrirUnidade(u)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Editar unidade"
                >
                  <Pencil className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() =>
                    window.confirm(
                      `Excluir a unidade ${nomeBloco.get(u.bloco_id) ?? ""} - ${u.numero}?`,
                    ) && excluirUnidade.mutate(u.id)
                  }
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Excluir unidade"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const novoLabel = tab === "blocos" ? "Novo Bloco" : tab === "unidades" ? "Nova Unidade" : "";

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

      {(condominioQuery.isError || blocosQuery.isError || unidadesQuery.isError) && (
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
        <DataTable
          data={unidades}
          columns={unidadeColumns}
          searchKeys={["numero", "status"]}
          pageSize={10}
          emptyMessage={
            podeEditar
              ? 'Nenhuma unidade cadastrada. Crie um bloco e depois clique em "Nova Unidade".'
              : "Nenhuma unidade cadastrada"
          }
        />
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
