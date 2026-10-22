import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { accessError } from "../errors";

export function AceitarConvite({ token, onAccepted }: { token: string; onAccepted: () => void }) {
  const { accountEmail, recarregarPerfil, logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const aceitar = async () => {
    setPending(true);
    setError("");
    try {
      const result = await supabase.rpc("aceitar_convite", { _token: token });
      if (result.error) throw result.error;
      await recarregarPerfil();
      onAccepted();
    } catch (e) {
      setError(accessError(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-teal-900">
      <section className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 space-y-4 dark:text-gray-100">
        <h1 className="text-xl font-semibold">Ativar acesso ao condomínio</h1>
        <p className="text-sm">
          Conta: <strong>{accountEmail}</strong>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ao aceitar, sua conta será vinculada ao cadastro autorizado pelo síndico.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          disabled={pending}
          onClick={() => void aceitar()}
          className="w-full rounded-lg py-2.5 bg-teal-600 text-white disabled:opacity-60"
        >
          {pending ? "Ativando..." : "Aceitar convite"}
        </button>
        <button
          disabled={pending}
          onClick={() => void logout()}
          className="w-full rounded-lg py-2 border"
        >
          Entrar com outra conta
        </button>
      </section>
    </div>
  );
}
