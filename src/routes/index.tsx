import { createFileRoute } from "@tanstack/react-router";
import { validateSearch } from "@/condo/permissions";
import App from "@/condo/App";

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch,
  head: () => ({
    meta: [
      { title: "SERCON — Gestão de Condomínios" },
      {
        name: "description",
        content:
          "Sistema de gestão de condomínios: moradores, financeiro, portaria, reservas e assembleias.",
      },
      { property: "og:title", content: "Gestão de Condomínios" },
      {
        property: "og:description",
        content:
          "Sistema de gestão de condomínios: moradores, financeiro, portaria, reservas e assembleias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});
