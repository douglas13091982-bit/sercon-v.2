import type { Page, UserRole } from "./types";

export const pagesByRole: Record<UserRole, readonly Page[]> = {
  sindico: [
    "dashboard",
    "condominio",
    "moradores",
    "acessos",
    "financeiro",
    "portaria",
    "comunicados",
    "reservas",
    "assembleias",
    "manutencao",
    "configuracoes",
  ],
  porteiro: ["portaria"],
  morador: ["dashboard", "comunicados", "financeiro", "portaria", "reservas", "assembleias"],
  super_admin: ["dashboard", "condominio", "configuracoes"],
};

export function canAccessPage(role: UserRole, page: Page): boolean {
  return pagesByRole[role].includes(page);
}

export function homePage(role: UserRole): Page {
  return role === "porteiro" ? "portaria" : "dashboard";
}

export const pageTitles: Record<Page, string> = {
  dashboard: "Painel",
  condominio: "Condomínio",
  moradores: "Moradores",
  acessos: "Usuários e acessos",
  financeiro: "Financeiro",
  portaria: "Portaria",
  comunicados: "Comunicados",
  reservas: "Reservas",
  assembleias: "Assembleias",
  manutencao: "Manutenção",
  configuracoes: "Configurações",
};

export function isPage(value: string): value is Page {
  return Object.hasOwn(pageTitles, value);
}

export function validateSearch(search: Record<string, unknown>): { convite?: string } {
  return typeof search["convite"] === "string" ? { convite: search["convite"].slice(0, 256) } : {};
}
