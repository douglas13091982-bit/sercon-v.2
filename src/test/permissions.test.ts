import { describe, expect, it } from "vitest";
import { canAccessPage, homePage, isPage, validateSearch } from "@/condo/permissions";

describe("permissões de navegação", () => {
  it("não concede administração pelo acesso direto à URL", () => {
    expect(canAccessPage("morador", "acessos")).toBe(false);
    expect(canAccessPage("morador", "moradores")).toBe(false);
    expect(canAccessPage("porteiro", "condominio")).toBe(false);
    expect(canAccessPage("super_admin", "moradores")).toBe(false);
    expect(canAccessPage("sindico", "acessos")).toBe(true);
  });
  it("abre a portaria para o porteiro e mantém as áreas do morador", () => {
    expect(homePage("porteiro")).toBe("portaria");
    expect(canAccessPage("morador", "assembleias")).toBe(true);
  });
  it("valida páginas e preserva apenas o parâmetro de convite", () => {
    expect(isPage("moradores")).toBe(true);
    expect(isPage("constructor")).toBe(false);
    expect(validateSearch({ convite: "token", role: "super_admin" })).toEqual({ convite: "token" });
    expect(validateSearch({ convite: 123 })).toEqual({});
  });
});
