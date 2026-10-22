import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { accessError } from "../errors";

const inputClass =
  "w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 dark:text-white";
const panel =
  "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4";

export function Acessos() {
  const { user } = useAuth();
  const condominioId = user?.condominioId ?? "";
  const client = useQueryClient();
  const [papel, setPapel] = useState<"morador" | "porteiro">("morador");
  const [moradorId, setMoradorId] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const enabled = !!condominioId && user?.role === "sindico";
  const moradores = useQuery({
    queryKey: ["moradores", condominioId],
    enabled,
    queryFn: async () => {
      const r = await supabase
        .from("moradores")
        .select("*")
        .eq("condominio_id", condominioId)
        .order("nome");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const convites = useQuery({
    queryKey: ["convites", condominioId],
    enabled,
    queryFn: async () => {
      const r = await supabase
        .from("convites_acesso")
        .select("id, email, papel, expira_em, aceito_em, revogado_em")
        .eq("condominio_id", condominioId)
        .order("criado_em", { ascending: false })
        .limit(100);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const acessos = useQuery({
    queryKey: ["acessos", condominioId],
    enabled,
    queryFn: async () => {
      const r = await supabase.rpc("listar_acessos");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const auditoria = useQuery({
    queryKey: ["auditoria", condominioId],
    enabled,
    queryFn: async () => {
      const r = await supabase
        .from("audit_logs")
        .select("*")
        .eq("condominio_id", condominioId)
        .order("criado_em", { ascending: false })
        .limit(30);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const invalidar = () => {
    for (const key of ["convites", "acessos", "auditoria", "moradores"])
      void client.invalidateQueries({ queryKey: [key, condominioId] });
  };
  const gerar = useMutation({
    mutationFn: async () => {
      const r = await supabase.rpc("criar_convite", {
        _email: email,
        _papel: papel,
        _morador_id: papel === "morador" ? moradorId : undefined,
      });
      if (r.error) throw r.error;
      return r.data;
    },
    onSuccess: (token) => {
      setLink(`${window.location.origin}/login?convite=${encodeURIComponent(token)}`);
      setCopiado(false);
      invalidar();
    },
    onError: (e) => setErro(accessError(e)),
  });
  const revogar = useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: "convite" | "acesso" }) => {
      const r =
        tipo === "convite"
          ? await supabase.rpc("revogar_convite", { _id: id })
          : await supabase.rpc("revogar_acesso", { _user_id: id });
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      setLink("");
      invalidar();
    },
    onError: (e) => setErro(accessError(e)),
  });
  const enviar = (event: FormEvent) => {
    event.preventDefault();
    setErro("");
    setLink("");
    gerar.mutate();
  };
  const indisponivel = gerar.isPending || revogar.isPending;
  const labels: Record<string, string> = {
    sindico: "Síndico",
    porteiro: "Porteiro",
    morador: "Morador",
    super_admin: "Super Admin",
  };
  return (
    <div className="space-y-6 dark:text-gray-100">
      <div>
        <h1 className="text-2xl font-bold">Usuários e acessos</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Convide moradores e porteiros para o seu condomínio.
        </p>
      </div>
      {erro && (
        <p role="alert" className="text-red-600">
          {erro}
        </p>
      )}
      {[moradores, convites, acessos, auditoria].some((q) => q.isError) && (
        <p role="alert" className="text-red-600">
          Não foi possível carregar os dados. Recarregue a página.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className={panel}>
          <h2 className="font-semibold text-lg">Gerar convite</h2>
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label htmlFor="papel" className="block text-sm mb-1">
                Permissão
              </label>
              <select
                id="papel"
                value={papel}
                onChange={(e) => {
                  setPapel(e.target.value as "morador" | "porteiro");
                  setMoradorId("");
                  setEmail("");
                  setLink("");
                }}
                className={inputClass}
              >
                <option value="morador">Morador</option>
                <option value="porteiro">Porteiro</option>
              </select>
            </div>
            {papel === "morador" && (
              <div>
                <label htmlFor="morador" className="block text-sm mb-1">
                  Morador cadastrado
                </label>
                <select
                  id="morador"
                  required
                  value={moradorId}
                  onChange={(e) => {
                    setMoradorId(e.target.value);
                    setEmail(moradores.data?.find((m) => m.id === e.target.value)?.email ?? "");
                    setLink("");
                  }}
                  className={inputClass}
                >
                  <option value="">Selecione um morador</option>
                  {moradores.data
                    ?.filter((m) => !m.user_id && m.unidade_id && m.email)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Cadastre a unidade e o e-mail em Moradores antes de convidar.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="convite-email" className="block text-sm mb-1">
                E-mail autorizado
              </label>
              <input
                id="convite-email"
                type="email"
                required
                maxLength={254}
                readOnly={papel === "morador"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              disabled={indisponivel || !enabled}
              className="rounded-lg bg-teal-600 text-white px-4 py-2 disabled:opacity-50"
            >
              {gerar.isPending ? "Gerando..." : "Gerar link de acesso"}
            </button>
          </form>
          {link && (
            <div className="space-y-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 p-3">
              <label htmlFor="convite-link" className="text-sm block">
                Link válido por 7 dias
              </label>
              <input
                id="convite-link"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className={inputClass}
              />
              <button
                className="text-sm font-medium text-teal-700 dark:text-teal-300"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopiado(true);
                  } catch {
                    setErro("Selecione e copie o link acima.");
                  }
                }}
              >
                {copiado ? "Link copiado" : "Copiar link"}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Compartilhe este link com a pessoa cadastrada. Gerar outro convite para o mesmo
                e-mail invalida o anterior.
              </p>
            </div>
          )}
        </section>
        <section className={panel}>
          <h2 className="font-semibold text-lg">Acessos ativos</h2>
          {acessos.isLoading ? (
            <p>Carregando...</p>
          ) : (
            acessos.data?.map((a) => (
              <div
                key={`${a.user_id}-${a.papel}`}
                className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.nome || a.email}</p>
                  <p className="text-xs text-gray-500 break-all">
                    {a.email} · {labels[a.papel]}
                  </p>
                </div>
                {["morador", "porteiro"].includes(a.papel) && (
                  <button
                    disabled={indisponivel}
                    className="text-sm text-red-600 shrink-0"
                    onClick={() => {
                      setErro("");
                      if (window.confirm(`Revogar o acesso de ${a.nome || a.email}?`))
                        revogar.mutate({ id: a.user_id, tipo: "acesso" });
                    }}
                  >
                    Revogar
                  </button>
                )}
              </div>
            ))
          )}
        </section>
      </div>
      <section className={panel}>
        <h2 className="font-semibold text-lg">Convites recentes</h2>
        <p className="text-xs text-gray-500">Até 100 convites mais recentes.</p>
        {!convites.data?.length && <p className="text-sm text-gray-500">Nenhum convite gerado.</p>}
        {convites.data?.map((c) => {
          const status = c.revogado_em
            ? "Revogado"
            : c.aceito_em
              ? "Aceito"
              : new Date(c.expira_em) <= new Date()
                ? "Expirado"
                : "Pendente";
          return (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3"
            >
              <div>
                <p className="font-medium break-all">{c.email}</p>
                <p className="text-xs text-gray-500">
                  {labels[c.papel]} · {status} · Expira em{" "}
                  {new Date(c.expira_em).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {status === "Pendente" && (
                <button
                  disabled={indisponivel}
                  onClick={() => {
                    setErro("");
                    revogar.mutate({ id: c.id, tipo: "convite" });
                  }}
                  className="text-sm text-red-600"
                >
                  Revogar convite
                </button>
              )}
            </div>
          );
        })}
      </section>
      <section className={panel}>
        <h2 className="font-semibold text-lg">Histórico de alterações</h2>
        <p className="text-sm text-gray-500">Últimos 30 eventos de cadastros e acessos.</p>
        {!auditoria.data?.length && (
          <p className="text-sm text-gray-500">Nenhuma alteração registrada.</p>
        )}
        {auditoria.data?.map((a) => (
          <div key={a.id} className="text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
            <span className="font-medium">
              {a.tabela} ·{" "}
              {(
                {
                  INSERT: "Criação",
                  UPDATE: "Atualização",
                  DELETE: "Exclusão",
                  REVOKE_ACCESS: "Revogação de acesso",
                } as Record<string, string>
              )[a.acao] ?? a.acao}
            </span>
            <span className="text-gray-500 block">
              {new Date(a.criado_em).toLocaleString("pt-BR")} ·{" "}
              {acessos.data?.find((u) => u.user_id === a.usuario_id)?.nome ||
                "Usuário removido ou sistema"}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
