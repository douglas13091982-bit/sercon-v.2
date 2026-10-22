import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "./contexts/AuthContext";
import { canAccessPage, homePage, isPage, pageTitles } from "./permissions";
import { Acessos } from "./pages/Acessos";
import { AceitarConvite } from "./pages/AceitarConvite";
import { Sidebar, MobileMenuButton } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Condominio } from "./pages/Condominio";
import { Moradores } from "./pages/Moradores";
import { Financeiro } from "./pages/Financeiro";
import { Portaria } from "./pages/Portaria";
import { Comunicados } from "./pages/Comunicados";
import { Reservas } from "./pages/Reservas";
import { Assembleias } from "./pages/Assembleias";
import { Manutencao } from "./pages/Manutencao";
import { Configuracoes } from "./pages/Configuracoes";
import { Page } from "./types";

function AppContent() {
  const {
    user,
    accountEmail,
    authError,
    logout,
    recarregarPerfil,
    condominioNome,
    loading,
    semVinculo,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[1] ?? "";
  const currentPage: Page = isPage(segment) ? segment : user ? homePage(user.role) : "dashboard";
  const convite = new URLSearchParams(location.searchStr).get("convite") ?? "";
  const setCurrentPage = (page: Page) => {
    void navigate({ to: "/$page", params: { page }, search: {} });
  };
  useEffect(() => {
    if (user && !convite && (location.pathname === "/" || location.pathname === "/login")) {
      void navigate({
        to: "/$page",
        params: { page: homePage(user.role) },
        search: {},
        replace: true,
      });
    }
  }, [user, convite, location.pathname, navigate]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (authError)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 dark:text-white">
        <div className="space-y-4">
          <p role="alert">{authError}</p>
          <button
            onClick={() => void recarregarPerfil()}
            className="rounded-lg bg-teal-600 text-white px-4 py-2"
          >
            Tentar novamente
          </button>
          <button onClick={() => void logout()} className="ml-3 underline">
            Sair
          </button>
        </div>
      </div>
    );
  if (convite && accountEmail)
    return (
      <AceitarConvite
        token={convite}
        onAccepted={() => {
          void navigate({ to: "/", search: {}, replace: true });
        }}
      />
    );
  if (!user || semVinculo) return <Login {...(convite ? { convite } : {})} />;

  const renderPage = () => {
    switch (currentPage) {
      case "acessos":
        return <Acessos />;
      case "dashboard":
        return <Dashboard />;
      case "condominio":
        return <Condominio />;
      case "moradores":
        return <Moradores />;
      case "financeiro":
        return <Financeiro />;
      case "portaria":
        return <Portaria />;
      case "comunicados":
        return <Comunicados />;
      case "reservas":
        return <Reservas />;
      case "assembleias":
        return <Assembleias />;
      case "manutencao":
        return <Manutencao />;
      case "configuracoes":
        return <Configuracoes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3">
              <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {pageTitles[currentPage]}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {condominioNome || "SERCON"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {!canAccessPage(user.role, currentPage) ? (
            <section className="p-6 bg-white dark:bg-gray-800 dark:text-white rounded-xl space-y-3">
              <h1 className="text-xl font-semibold">Acesso não permitido</h1>
              <p>Seu perfil não tem permissão para esta página.</p>
              <button
                className="text-teal-600 underline"
                onClick={() => setCurrentPage(homePage(user.role))}
              >
                Voltar ao meu painel
              </button>
            </section>
          ) : (
            <>
              {!["dashboard", "condominio", "moradores", "acessos"].includes(currentPage) && (
                <div
                  role="status"
                  className="mb-5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-4 text-sm"
                >
                  <strong>Módulo em demonstração.</strong> Os exemplos desta tela ainda não são
                  dados do seu condomínio. O salvamento definitivo será conectado nas próximas
                  etapas.
                </div>
              )}
              {renderPage()}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
