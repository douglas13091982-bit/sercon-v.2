import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Car, PawPrint, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DataTable } from "../components/DataTable";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import { Contrato, Pet, Veiculo } from "../types";

type MoradorRow = Tables<"moradores">;
type Tipo = "proprietario" | "inquilino" | "dependente";

interface FormState {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  tipo: Tipo;
  unidadeId: string;
}

const formVazio: FormState = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  tipo: "proprietario",
  unidadeId: "",
};

type TipoInfo = { label: string; variant: "success" | "info" | "neutral" };

const tipoLabel: Record<Tipo, TipoInfo> = {
  proprietario: { label: "Proprietário", variant: "success" },
  inquilino: { label: "Inquilino", variant: "info" },
  dependente: { label: "Dependente", variant: "neutral" },
};

function infoTipo(tipo: string): TipoInfo {
  return tipoLabel[tipo as Tipo] ?? tipoLabel.dependente;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function formatarCpf(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

function asArray<T>(valor: unknown): T[] {
  return Array.isArray(valor) ? (valor as T[]) : [];
}

export function Moradores() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const condominioId = user?.condominioId ?? "";
  const podeEditar = user?.role === "sindico" || user?.role === "super_admin";

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(formVazio);
  const [erro, setErro] = useState("");
  const [selecionado, setSelecionado] = useState<MoradorRow | null>(null);

  const moradoresQuery = useQuery({
    queryKey: ["moradores", condominioId],
    enabled: !!condominioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moradores")
        .select("*")
        .eq("condominio_id", condominioId)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const unidadesQuery = useQuery({
    queryKey: ["unidades-select", condominioId],
    enabled: !!condominioId,
    queryFn: async () => {
      const [{ data: unidades, error: e1 }, { data: blocos, error: e2 }] = await Promise.all([
        supabase
          .from("unidades")
          .select("id, numero, bloco_id")
          .eq("condominio_id", condominioId)
          .order("numero"),
        supabase.from("blocos").select("id, nome").eq("condominio_id", condominioId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const nomeBloco = new Map((blocos ?? []).map((b) => [b.id, b.nome]));
      return (unidades ?? []).map((u) => ({
        id: u.id,
        label: `${nomeBloco.get(u.bloco_id) ?? "?"} - ${u.numero}`,
      }));
    },
  });

  const moradores = moradoresQuery.data ?? [];
  const unidades = unidadesQuery.data ?? [];
  const labelUnidade = useMemo(() => new Map(unidades.map((u) => [u.id, u.label])), [unidades]);
  const unidadeLabel = (id: string | null) => (id ? (labelUnidade.get(id) ?? "-") : "-");

  const salvar = useMutation({
    mutationFn: async (f: FormState) => {
      const dados = {
        nome: f.nome.trim(),
        cpf: f.cpf.replace(/\D/g, "") || null,
        telefone: f.telefone.trim() || null,
        email: f.email.trim().toLowerCase() || null,
        tipo: f.tipo,
        unidade_id: f.unidadeId || null,
      };
      const { error } = editandoId
        ? await supabase
            .from("moradores")
            .update(dados)
            .eq("condominio_id", condominioId)
            .eq("id", editandoId)
            .select("id")
            .single()
        : await supabase.from("moradores").insert({ ...dados, condominio_id: condominioId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moradores", condominioId] });
      fecharModal();
    },
    onError: (e: { code?: string; message?: string }) => {
      setErro(
        e.code === "23505"
          ? "Já existe um morador com este CPF neste condomínio"
          : "Não foi possível salvar. Tente novamente.",
      );
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("moradores")
        .delete()
        .eq("condominio_id", condominioId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moradores", condominioId] });
      setSelecionado(null);
    },
    onError: () =>
      window.alert(
        "Não foi possível excluir. Revogue o acesso do morador em Usuários e acessos antes de tentar novamente.",
      ),
  });

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(formVazio);
    setErro("");
    setModalAberto(true);
  };

  const abrirEdicao = (m: MoradorRow) => {
    setEditandoId(m.id);
    setForm({
      nome: m.nome,
      cpf: formatarCpf(m.cpf ?? ""),
      telefone: m.telefone ?? "",
      email: m.email ?? "",
      tipo: (m.tipo as Tipo) ?? "proprietario",
      unidadeId: m.unidade_id ?? "",
    });
    setErro("");
    setSelecionado(null);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
    setErro("");
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!form.nome.trim()) return setErro("Informe o nome do morador");
    if (form.cpf.trim() && !cpfValido(form.cpf)) return setErro("CPF inválido");
    salvar.mutate(form);
  };

  const confirmarExclusao = (m: MoradorRow) => {
    if (window.confirm(`Excluir o morador "${m.nome}"? Esta ação não pode ser desfeita.`)) {
      excluir.mutate(m.id);
    }
  };

  const columns = [
    {
      key: "nome",
      header: "Nome",
      render: (m: MoradorRow) => (
        <button
          onClick={() => setSelecionado(m)}
          className="flex items-center gap-2 hover:text-teal-600 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 text-xs font-bold">
            {m.nome.charAt(0)}
          </div>
          <span className="font-medium">{m.nome}</span>
        </button>
      ),
    },
    { key: "cpf", header: "CPF", render: (m: MoradorRow) => (m.cpf ? formatarCpf(m.cpf) : "-") },
    { key: "telefone", header: "Telefone" },
    { key: "email", header: "E-mail" },
    {
      key: "tipo",
      header: "Tipo",
      render: (m: MoradorRow) => {
        const t = infoTipo(m.tipo);
        return <Badge variant={t.variant}>{t.label}</Badge>;
      },
    },
    {
      key: "acesso",
      header: "Acesso",
      render: (m: MoradorRow) => (
        <Badge variant={m.user_id ? "success" : "neutral"}>
          {m.user_id ? "Ativo" : "Sem acesso"}
        </Badge>
      ),
    },
    { key: "unidade_id", header: "Unidade", render: (m: MoradorRow) => unidadeLabel(m.unidade_id) },
  ];

  const veiculos = selecionado ? asArray<Veiculo>(selecionado.veiculos) : [];
  const pets = selecionado ? asArray<Pet>(selecionado.pets) : [];
  const contrato = (selecionado?.contrato ?? null) as Contrato | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moradores</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Proprietários, inquilinos e dependentes
          </p>
        </div>
        {podeEditar && (
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Morador
          </button>
        )}
      </div>

      {podeEditar && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Após cadastrar a unidade e o e-mail, gere o convite em Usuários e acessos para liberar o
          login do morador.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            rotulo: "Proprietários",
            valor: moradores.filter((m) => m.tipo === "proprietario").length,
          },
          { rotulo: "Inquilinos", valor: moradores.filter((m) => m.tipo === "inquilino").length },
          { rotulo: "Total", valor: moradores.length },
        ].map((card) => (
          <div
            key={card.rotulo}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.rotulo}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.valor}</p>
          </div>
        ))}
      </div>

      {unidadesQuery.isError && (
        <p role="alert" className="text-sm text-red-500">
          Não foi possível carregar as unidades. Recarregue antes de editar os vínculos.
        </p>
      )}
      {moradoresQuery.isError && (
        <p className="text-sm text-red-500">
          Não foi possível carregar os moradores. Recarregue a página.
        </p>
      )}

      {moradoresQuery.isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando moradores...</p>
      ) : (
        <DataTable
          data={moradores}
          columns={columns}
          searchKeys={["nome", "cpf", "telefone", "email", "tipo"]}
          pageSize={10}
          emptyMessage={
            podeEditar
              ? 'Nenhum morador cadastrado. Clique em "Novo Morador" para começar.'
              : "Nenhum morador cadastrado"
          }
        />
      )}

      {/* Detalhes */}
      <Modal
        open={!!selecionado}
        onClose={() => setSelecionado(null)}
        title={selecionado?.nome || ""}
        size="lg"
      >
        {selecionado && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 text-2xl font-bold">
                {selecionado.nome.charAt(0)}
              </div>
              <div>
                <Badge variant={infoTipo(selecionado.tipo).variant}>
                  {infoTipo(selecionado.tipo).label}
                </Badge>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Unidade: {unidadeLabel(selecionado.unidade_id)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { rotulo: "CPF", valor: selecionado.cpf },
                { rotulo: "Telefone", valor: selecionado.telefone },
                { rotulo: "E-mail", valor: selecionado.email },
              ].map((item) => (
                <div key={item.rotulo} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.rotulo}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.valor || "-"}
                  </p>
                </div>
              ))}
            </div>
            {veiculos.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <Car className="w-4 h-4" /> Veículos
                </h4>
                {veiculos.map((v, i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-2">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {v.marca} {v.modelo} - {v.cor}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Placa: {v.placa} {v.vaga ? `• Vaga: ${v.vaga}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {pets.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <PawPrint className="w-4 h-4" /> Pets
                </h4>
                {pets.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-2">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {p.nome} - {p.tipo} ({p.raca})
                    </p>
                  </div>
                ))}
              </div>
            )}
            {contrato && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Contrato de Locação
                </h4>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    Início: {contrato.inicio} → Fim: {contrato.fim}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    Valor: R$ {Number(contrato.valor).toLocaleString("pt-BR")}/mês
                  </p>
                  {contrato.imobiliária && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Imobiliária: {contrato.imobiliária}
                    </p>
                  )}
                </div>
              </div>
            )}
            {podeEditar && (
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => confirmarExclusao(selecionado)}
                  disabled={excluir.isPending}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
                <button
                  onClick={() => abrirEdicao(selecionado)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Novo / editar */}
      <Modal
        open={modalAberto}
        onClose={fecharModal}
        title={editandoId ? "Editar Morador" : "Novo Morador"}
        size="lg"
      >
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="morador-nome" className={labelClass}>
                Nome completo *
              </label>
              <input
                id="morador-nome"
                required
                maxLength={150}
                className={inputClass}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="morador-cpf" className={labelClass}>
                CPF
              </label>
              <input
                id="morador-cpf"
                className={inputClass}
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatarCpf(e.target.value) })}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </div>
            <div>
              <label htmlFor="morador-telefone" className={labelClass}>
                Telefone/WhatsApp
              </label>
              <input
                id="morador-telefone"
                className={inputClass}
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label htmlFor="morador-email" className={labelClass}>
                E-mail
              </label>
              <input
                id="morador-email"
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="morador-tipo" className={labelClass}>
                Tipo
              </label>
              <select
                id="morador-tipo"
                className={inputClass}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as Tipo })}
              >
                <option value="proprietario">Proprietário</option>
                <option value="inquilino">Inquilino</option>
                <option value="dependente">Dependente</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="morador-unidade" className={labelClass}>
                Unidade
              </label>
              <select
                id="morador-unidade"
                className={inputClass}
                value={form.unidadeId}
                onChange={(e) => setForm({ ...form, unidadeId: e.target.value })}
              >
                <option value="">
                  {unidades.length === 0 ? "Nenhuma unidade cadastrada" : "Sem unidade"}
                </option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={fecharModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvar.isPending || unidadesQuery.isError || unidadesQuery.isLoading}
              className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg"
            >
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
