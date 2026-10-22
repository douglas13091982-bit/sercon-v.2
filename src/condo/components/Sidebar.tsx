import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { canAccessPage } from "../permissions";
import { Page } from "../types";
import {
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  Shield,
  MessageSquare,
  Calendar,
  FileText,
  Wrench,
  Settings,
  LogOut,
  X,
  Menu,
} from "lucide-react";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const menuByRole: Record<string, { page: Page; label: string; icon: React.ReactNode }[]> = {
  sindico: [
    { page: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { page: "condominio", label: "Condomínio", icon: <Building2 className="w-5 h-5" /> },
    { page: "acessos", label: "Usuários e acessos", icon: <Users className="w-5 h-5" /> },
    { page: "moradores", label: "Moradores", icon: <Users className="w-5 h-5" /> },
    { page: "financeiro", label: "Financeiro", icon: <DollarSign className="w-5 h-5" /> },
    { page: "portaria", label: "Portaria", icon: <Shield className="w-5 h-5" /> },
    { page: "comunicados", label: "Comunicados", icon: <MessageSquare className="w-5 h-5" /> },
    { page: "reservas", label: "Reservas", icon: <Calendar className="w-5 h-5" /> },
    { page: "assembleias", label: "Assembleias", icon: <FileText className="w-5 h-5" /> },
    { page: "manutencao", label: "Manutenção", icon: <Wrench className="w-5 h-5" /> },
    { page: "configuracoes", label: "Configurações", icon: <Settings className="w-5 h-5" /> },
  ],
  porteiro: [{ page: "portaria", label: "Portaria", icon: <Shield className="w-5 h-5" /> }],
  morador: [
    { page: "dashboard", label: "Meu Painel", icon: <LayoutDashboard className="w-5 h-5" /> },
    { page: "comunicados", label: "Comunicados", icon: <MessageSquare className="w-5 h-5" /> },
    { page: "financeiro", label: "Financeiro", icon: <DollarSign className="w-5 h-5" /> },
    { page: "portaria", label: "Encomendas", icon: <Shield className="w-5 h-5" /> },
    { page: "reservas", label: "Reservas", icon: <Calendar className="w-5 h-5" /> },
  ],
  super_admin: [
    { page: "dashboard", label: "Visão Geral", icon: <LayoutDashboard className="w-5 h-5" /> },
    { page: "condominio", label: "Condomínios", icon: <Building2 className="w-5 h-5" /> },
    { page: "configuracoes", label: "Planos", icon: <Settings className="w-5 h-5" /> },
  ],
};

export function Sidebar({ currentPage, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const menuItems = (menuByRole[user.role] || []).filter((item) =>
    canAccessPage(user.role, item.page),
  );

  const roleLabels: Record<string, string> = {
    sindico: "Síndico",
    porteiro: "Porteiro",
    morador: "Morador",
    super_admin: "Super Admin",
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-teal-700/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-400 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">SERCON</h1>
            <p className="text-xs text-teal-200">{roleLabels[user.role]}</p>
          </div>
          <button onClick={onMobileClose} className="lg:hidden p-1 rounded hover:bg-teal-700/50">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.page}
            onClick={() => {
              onNavigate(item.page);
              onMobileClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === item.page
                ? "bg-teal-500/20 text-white border border-teal-400/30"
                : "text-teal-100 hover:bg-teal-700/30 hover:text-white"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-teal-700/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-teal-200 truncate">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-teal-700/50 text-teal-200 hover:text-white"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-gradient-to-b from-teal-800 to-teal-900 min-h-screen fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative w-72 h-full bg-gradient-to-b from-teal-800 to-teal-900">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
    </button>
  );
}
