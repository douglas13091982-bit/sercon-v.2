interface AuthFailure {
  message: string;
  code?: string | undefined;
}

export function translateAuthError(error: AuthFailure): string {
  const code = error.code;
  const message = error.message.toLowerCase();
  if (code === "email_provider_disabled" || message.includes("email signups are disabled"))
    return "O cadastro por e-mail está desativado. Peça ao administrador para habilitar essa opção.";
  if (code === "signup_disabled" || message.includes("signups not allowed"))
    return "O cadastro de novas contas está desativado. Entre em contato com o administrador.";
  if (code === "invalid_credentials" || message.includes("invalid login credentials"))
    return "E-mail ou senha incorretos";
  if (code === "email_not_confirmed" || message.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar (verifique a caixa de entrada)";
  if (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered")
  )
    return "Este e-mail já está cadastrado";
  if (code === "weak_password")
    return "A senha não atende aos requisitos. Use uma senha mais longa com letras, números e símbolos.";
  if (message.includes("password") && message.includes("characters"))
    return "A senha deve ter pelo menos 6 caracteres";
  if (code === "email_address_invalid") return "Informe um endereço de e-mail válido.";
  if (code === "email_address_not_authorized")
    return "O envio de e-mail para este endereço não está autorizado. Entre em contato com o administrador.";
  if (code === "over_email_send_rate_limit")
    return "O limite de envio de e-mails foi atingido. Aguarde e tente novamente.";
  if (code === "over_request_rate_limit" || message.includes("rate limit"))
    return "Muitas tentativas. Aguarde um pouco e tente novamente";
  if (message.includes("error sending confirmation email"))
    return "Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde.";
  return "Não foi possível concluir. Tente novamente";
}
