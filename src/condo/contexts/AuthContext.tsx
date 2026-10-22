import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { User, UserRole } from "../types";
import { translateAuthError } from "../auth-errors";

interface SignUpInput {
  nome: string;
  email: string;
  password: string;
  condominioNome?: string;
  convite?: string;
}

interface AuthContextType {
  /** Usuário com perfil e papel carregados; null se não autenticado. */
  user: User | null;
  accountEmail: string | null;
  authError: string;
  /** Nome do condomínio do usuário (vazio para super admin ou sem vínculo). */
  condominioNome: string;
  /** true enquanto a sessão inicial está sendo verificada. */
  loading: boolean;
  /** Autenticado, mas sem papel/condomínio vinculado (aguardando convite). */
  semVinculo: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  /** Retorna { erro } em falha ou { aviso } quando a conta exige confirmação de e-mail. */
  signUp: (input: SignUpInput) => Promise<{ erro?: string; aviso?: string }>;
  logout: () => Promise<void>;
  /** Recarrega perfil, papel e nome do condomínio (ex.: após renomear o condomínio). */
  recarregarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Prioridade quando o usuário tem mais de um papel
const rolePriority: UserRole[] = ["super_admin", "sindico", "porteiro", "morador"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const accessKey = useRef("");
  const [user, setUser] = useState<User | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const generation = useRef(0);
  const [condominioNome, setCondominioNome] = useState("");
  const [semVinculo, setSemVinculo] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (session: Session | null) => {
      const request = ++generation.current;
      setAuthError("");
      setAccountEmail(session?.user.email ?? null);
      if (!session) {
        accessKey.current = "";
        queryClient.clear();
        setUser(null);
        setCondominioNome("");
        setSemVinculo(false);
        return;
      }
      try {
        const [profileResult, rolesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("nome, email, condominio_id")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (rolesResult.error) throw rolesResult.error;
        const perfil = profileResult.data;
        const roles = (rolesResult.data ?? []).map((r) => r.role as UserRole);
        const role = rolePriority.find((r) => roles.includes(r));
        if (request !== generation.current) return;
        if (!role || (!perfil?.condominio_id && role !== "super_admin")) {
          queryClient.clear();
          accessKey.current = "";
          setUser(null);
          setCondominioNome("");
          setSemVinculo(true);
          return;
        }
        let nomeCondominio = "";
        if (perfil?.condominio_id) {
          const { data, error } = await supabase
            .from("condominios")
            .select("nome")
            .eq("id", perfil.condominio_id)
            .single();
          if (error) throw error;
          nomeCondominio = data.nome;
        }
        if (request !== generation.current) return;
        const key = `${session.user.id}:${role}:${perfil?.condominio_id ?? ""}`;
        if (key !== accessKey.current) {
          queryClient.clear();
          accessKey.current = key;
        }
        setSemVinculo(false);
        setCondominioNome(nomeCondominio);
        setUser({
          id: session.user.id,
          name: perfil?.nome || session.user.email || "Usuário",
          email: perfil?.email || session.user.email || "",
          role,
          condominioId: perfil?.condominio_id ?? "",
        });
      } catch {
        if (request === generation.current)
          setAuthError(
            "Não foi possível carregar seu acesso. Verifique a conexão e tente novamente.",
          );
      }
    },
    [queryClient],
  );

  useEffect(() => {
    let active = true;

    // Listener primeiro, depois a sessão atual (evita perder eventos)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Adia a consulta: não chamar o Supabase dentro do callback de auth
      setTimeout(() => {
        if (!active) return;
        loadProfile(newSession).finally(() => active && setLoading(false));
      }, 0);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!active) return;
        return loadProfile(data.session).finally(() => active && setLoading(false));
      })
      .catch(() => {
        if (active) {
          setAuthError("Não foi possível verificar sua sessão. Tente novamente.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
      ++generation.current;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? translateAuthError(error) : null;
  };

  const signUp = async ({
    nome,
    email,
    password,
    condominioNome,
    convite,
  }: SignUpInput): Promise<{ erro?: string; aviso?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        ...(typeof window !== "undefined"
          ? {
              emailRedirectTo: `${window.location.origin}/login${convite ? `?convite=${encodeURIComponent(convite)}` : ""}`,
            }
          : {}),
        data: {
          nome: nome.trim(),
          ...(condominioNome?.trim() ? { condominio_nome: condominioNome.trim() } : {}),
        },
      },
    });
    if (error) {
      console.error("[SERCON Auth] Falha no cadastro", { code: error.code, status: error.status });
      return { erro: translateAuthError(error) };
    }
    if (!data.session) {
      return {
        aviso: "Conta criada! Enviamos um e-mail de confirmação: confirme para poder entrar.",
      };
    }
    return {};
  };

  const recarregarPerfil = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await loadProfile(data.session);
    } catch {
      setAuthError("Não foi possível verificar sua sessão. Tente novamente.");
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await loadProfile(null);
    } catch {
      setAuthError("Não foi possível sair da conta. Tente novamente.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accountEmail,
        authError,
        condominioNome,
        loading,
        semVinculo,
        login,
        signUp,
        logout,
        recarregarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
