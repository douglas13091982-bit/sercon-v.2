export function accessError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    error.code === "P0001" &&
    typeof error.message === "string"
  )
    return error.message;
  return "Não foi possível concluir. Verifique seu acesso e tente novamente.";
}
