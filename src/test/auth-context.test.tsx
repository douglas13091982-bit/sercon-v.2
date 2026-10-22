import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "@/condo/pages/Login";
import { AuthProvider, useAuth } from "@/condo/contexts/AuthContext";

const api = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  callback: null as null | ((event: string, session: Session | null) => void),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: api.from,
    auth: {
      getSession: api.getSession,
      signOut: api.signOut,
      signUp: api.signUp,
      onAuthStateChange: (callback: typeof api.callback) => {
        api.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

const session = { user: { id: "user-a", email: "a@example.invalid" } } as Session;
function Probe() {
  const auth = useAuth();
  return (
    <div>
      {auth.loading
        ? "Carregando"
        : auth.authError
          ? "Falha de conexão"
          : auth.semVinculo
            ? "Sem vínculo"
            : auth.user
              ? auth.user.name
              : "Desconectado"}
    </div>
  );
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return client;
}

describe("sessão e perfil", () => {
  beforeEach(() => {
    api.getSession.mockReset();
    api.from.mockReset();
    api.signUp.mockReset();
    api.callback = null;
  });
  it("mostra erro de conexão sem confundir com conta sem vínculo", async () => {
    api.getSession.mockResolvedValue({ data: { session }, error: null });
    api.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: { message: "offline" } }),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).then(resolve),
        }),
      }),
    }));
    mount();
    expect(await screen.findByText("Falha de conexão")).toBeInTheDocument();
    expect(screen.queryByText("Sem vínculo")).not.toBeInTheDocument();
  });
  it("explica a configuração desativada quando o backend rejeita o cadastro por e-mail", async () => {
    api.getSession.mockResolvedValue({ data: { session: null }, error: null });
    api.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "email_provider_disabled",
        message: "Email signups are disabled",
        status: 400,
      },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = new QueryClient();
    try {
      render(
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </QueryClientProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Criar condomínio" }));
      fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Síndico teste" } });
      fireEvent.change(screen.getByLabelText("Nome do condomínio"), {
        target: { value: "Condomínio teste" },
      });
      fireEvent.change(screen.getByLabelText("E-mail"), {
        target: { value: "test@example.invalid" },
      });
      fireEvent.change(screen.getByLabelText("Senha"), {
        target: { value: "senha-ficticia-de-teste" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Criar conta e condomínio" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "O cadastro por e-mail está desativado",
      );
      expect(api.from).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith("[SERCON Auth] Falha no cadastro", {
        code: "email_provider_disabled",
        status: 400,
      });
      expect(consoleError.mock.calls.flat().join(" ")).not.toContain("test@example.invalid");
    } finally {
      consoleError.mockRestore();
    }
  });
  it("não restaura um usuário quando uma consulta antiga termina depois da saída", async () => {
    let finishProfile: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      finishProfile = resolve;
    });
    api.getSession.mockResolvedValue({ data: { session }, error: null });
    api.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          table === "profiles"
            ? { maybeSingle: () => pending }
            : Promise.resolve({ data: [{ role: "sindico" }], error: null }),
      }),
    }));
    const client = mount();
    await waitFor(() => expect(api.from).toHaveBeenCalled());
    client.setQueryData(["private-cache"], "dados da conta anterior");
    act(() => api.callback?.("SIGNED_OUT", null));
    expect(await screen.findByText("Desconectado")).toBeInTheDocument();
    await act(async () => {
      finishProfile({ data: { nome: "Usuário antigo", condominio_id: "cond-a" }, error: null });
      await pending;
    });
    expect(screen.getByText("Desconectado")).toBeInTheDocument();
    expect(client.getQueryData(["private-cache"])).toBeUndefined();
  });
});
