import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Users, Home, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";

const panel =
  "bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700";

export function Dashboard() {
  const { user, condominioNome } = useAuth();
  const navigate = useNavigate();
  const id = user?.condominioId ?? "";
  const superAdmin = user?.role === "super_admin";
  const morador = user?.role === "morador";
  const resumo = useQuery({
    queryKey: ["dashboard-real", user?.id, id, user?.role],
    enabled: !!user && (superAdmin || !!id),
    queryFn: async () => {
      let unidadesQuery = supabase.from("unidades").select("id, status, numero, bloco_id");
      let moradoresQuery = supabase.from("moradores").select("*");
      if (!superAdmin) {
        unidadesQuery = unidadesQuery.eq("condominio_id", id);
        moradoresQuery = moradoresQuery.eq("condominio_id", id);
      }
      if (morador && user) moradoresQuery = moradoresQuery.eq("user_id", user.id);
      const [unidades, moradores, condominios] = await Promise.all([
        unidadesQuery,
        moradoresQuery,
        superAdmin
          ? supabase.from("condominios").select("id", { count: "exact", head: true })
          : Promise.resolve({ count: null, error: null }),
      ]);
      if (unidades.error) throw unidades.error;
      if (moradores.error) throw moradores.error;
      if (condominios.error) throw condominios.error;
      return {
        unidades: unidades.data,
        moradores: moradores.data,
        condominios: condominios.count ?? 0,
      };
    },
  });
  const dados = resumo.data;
  const meuCadastro = dados?.moradores[0];
  const minhaUnidade = dados?.unidades.find((u) => u.id === meuCadastro?.unidade_id);
  return (
    <div className="space-y-6 dark:text-gray-100">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.name.split(" ")[0]}!</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {condominioNome || "Visão geral da plataforma SERCON"}
        </p>
      </div>
      {resumo.isLoading && <p>Carregando dados...</p>}
      {resumo.isError && (
        <p role="alert" className="text-red-600">
          Não foi possível carregar o painel.{" "}
          <button className="underline" onClick={() => void resumo.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {dados && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {superAdmin && (
            <div className={panel}>
              <Building2 className="text-teal-600 mb-3" />
              <p className="text-sm text-gray-500">Condomínios cadastrados</p>
              <p className="text-3xl font-bold">{dados.condominios}</p>
            </div>
          )}
          <div className={panel}>
            <Home className="text-teal-600 mb-3" />
            <p className="text-sm text-gray-500">
              {morador ? "Minha unidade" : "Unidades cadastradas"}
            </p>
            <p className="text-3xl font-bold">
              {morador ? (minhaUnidade?.numero ?? "Sem unidade") : dados.unidades.length}
            </p>
            {!morador && (
              <p className="text-xs text-gray-500 mt-2">
                {dados.unidades.filter((u) => u.status === "ocupado").length} ocupadas
              </p>
            )}
          </div>
          <div className={panel}>
            <Users className="text-teal-600 mb-3" />
            <p className="text-sm text-gray-500">
              {morador ? "Meu cadastro" : "Moradores cadastrados"}
            </p>
            <p className={morador ? "font-semibold mt-2" : "text-3xl font-bold"}>
              {morador ? (meuCadastro?.nome ?? "Cadastro não encontrado") : dados.moradores.length}
            </p>
            {morador && <p className="text-sm text-gray-500 break-all">{meuCadastro?.email}</p>}
          </div>
          {!superAdmin && (
            <div className={panel}>
              <KeyRound className="text-teal-600 mb-3" />
              <p className="text-sm text-gray-500">Seu acesso</p>
              <p className="font-semibold mt-2">{morador ? "Morador" : "Síndico"}</p>
              <p className="text-xs text-gray-500 mt-2">Dados do seu condomínio</p>
            </div>
          )}
        </div>
      )}
      {user?.role === "sindico" && (
        <section className={panel}>
          <h2 className="text-lg font-semibold mb-3">Cadastros do condomínio</h2>
          <p className="text-sm text-gray-500 mb-4">
            Cadastre os blocos e unidades, adicione os moradores e gere os links de acesso.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { page: "condominio", label: "Blocos e unidades" },
              { page: "moradores", label: "Moradores" },
              { page: "acessos", label: "Convidar usuários" },
            ].map((item) => (
              <button
                key={item.page}
                className="rounded-lg px-4 py-2 bg-teal-600 text-white text-sm"
                onClick={() =>
                  void navigate({ to: "/$page", params: { page: item.page }, search: {} })
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
