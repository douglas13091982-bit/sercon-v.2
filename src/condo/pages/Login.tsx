import { useState, type FormEvent } from "react";
import { Building2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const inputClass =
  "w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none";

export function Login({ convite }: { convite?: string }) {
  const { login, signUp, logout, semVinculo, recarregarPerfil } = useAuth();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [nome, setNome] = useState("");
  const [condominioNome, setCondominioNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim()) return setError("Informe o e-mail");
    if (password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres");
    if (modo === "cadastrar" && !nome.trim()) return setError("Informe seu nome");
    if (modo === "cadastrar" && !convite && !condominioNome.trim())
      return setError("Informe o nome do condomínio");
    setLoading(true);
    try {
      if (modo === "entrar") {
        const erro = await login(email, password);
        if (erro) setError(erro);
      } else {
        const result = await signUp({
          nome,
          email,
          password,
          ...(convite ? { convite } : { condominioNome }),
        });
        if (result.erro) setError(result.erro);
        if (result.aviso) {
          setInfo(result.aviso);
          setModo("entrar");
          setPassword("");
        }
      }
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building2 className="w-12 h-12 text-white mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">SERCON</h1>
          <p className="text-teal-200 mt-2">Gestão condominial inteligente</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
          {semVinculo && !convite ? (
            <div className="space-y-4 text-gray-700 dark:text-gray-200">
              <h2 className="text-xl font-semibold">Aguardando vínculo</h2>
              <p>
                Peça ao síndico um link de convite e abra-o para ativar seu acesso ao condomínio.
              </p>
              <button
                onClick={() => void recarregarPerfil()}
                className="w-full py-2.5 rounded-lg bg-teal-600 text-white"
              >
                Verificar acesso
              </button>
              <button onClick={() => void logout()} className="w-full py-2.5 rounded-lg border">
                Sair
              </button>
            </div>
          ) : (
            <>
              {convite && (
                <p className="mb-4 text-sm text-teal-700 dark:text-teal-300">
                  Você recebeu um convite. Entre ou crie uma conta com o e-mail informado ao
                  síndico.
                </p>
              )}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
                {(["entrar", "cadastrar"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setModo(m);
                      setError("");
                      setInfo("");
                    }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium ${modo === m ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-300"}`}
                  >
                    {m === "entrar" ? "Entrar" : convite ? "Criar conta" : "Criar condomínio"}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {modo === "cadastrar" && (
                  <>
                    <div>
                      <label htmlFor="nome" className="block text-sm mb-1 dark:text-gray-200">
                        Seu nome
                      </label>
                      <input
                        id="nome"
                        required
                        maxLength={150}
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className={inputClass}
                        autoComplete="name"
                      />
                    </div>
                    {!convite && (
                      <div>
                        <label
                          htmlFor="condominio"
                          className="block text-sm mb-1 dark:text-gray-200"
                        >
                          Nome do condomínio
                        </label>
                        <input
                          id="condominio"
                          required
                          maxLength={150}
                          value={condominioNome}
                          onChange={(e) => setCondominioNome(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm mb-1 dark:text-gray-200">
                    E-mail
                  </label>
                  <input
                    id="email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="senha" className="block text-sm mb-1 dark:text-gray-200">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="senha"
                      required
                      minLength={6}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-3 text-gray-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && (
                  <p role="alert" className="text-sm text-red-600">
                    {error}
                  </p>
                )}
                {info && (
                  <p role="status" className="text-sm text-teal-700 dark:text-teal-300">
                    {info}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium rounded-lg"
                >
                  {loading
                    ? "Aguarde..."
                    : modo === "entrar"
                      ? "Entrar"
                      : convite
                        ? "Criar conta"
                        : "Criar conta e condomínio"}
                </button>
              </form>
              {!convite && modo === "cadastrar" && (
                <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                  Você será o síndico do novo condomínio. Moradores e porteiros entram por convite.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
