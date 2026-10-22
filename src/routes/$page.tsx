import { createFileRoute, notFound } from "@tanstack/react-router";
import App from "@/condo/App";
import { isPage, validateSearch } from "@/condo/permissions";

export const Route = createFileRoute("/$page")({
  ssr: false,
  validateSearch,
  beforeLoad: ({ params }) => {
    if (params.page !== "login" && !isPage(params.page)) throw notFound();
  },
  component: App,
});
