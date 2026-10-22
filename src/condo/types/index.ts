export type UserRole = "sindico" | "porteiro" | "morador" | "super_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  condominioId: string;
}

export interface Condominio {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logo?: string;
  totalUnidades: number;
  blocos: Bloco[];
}

export interface Bloco {
  id: string;
  condominioId: string;
  nome: string;
  unidades: Unidade[];
}

export interface Unidade {
  id: string;
  condominioId: string;
  blocoId: string;
  numero: string;
  andar: number;
  metragem: number;
  fracaoIdeal: number;
  status: "ocupado" | "vago" | "venda";
  proprietarioId?: string;
  inquilinoId?: string;
}

export interface Morador {
  id: string;
  condominioId: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  tipo: "proprietario" | "inquilino" | "dependente";
  unidadeId?: string;
  foto?: string;
  veiculos?: Veiculo[];
  pets?: Pet[];
  contrato?: Contrato;
}

export interface Veiculo {
  marca: string;
  modelo: string;
  placa: string;
  cor: string;
  vaga?: string;
}

export interface Pet {
  nome: string;
  tipo: string;
  raca: string;
}

export interface Contrato {
  inicio: string;
  fim: string;
  imobiliária?: string;
  valor: number;
}

export interface Despesa {
  id: string;
  condominioId: string;
  categoria: string;
  descricao: string;
  fornecedor: string;
  valor: number;
  vencimento: string;
  status: "pago" | "pendente" | "atrasado";
  recorrente: boolean;
  dataPagamento?: string;
}

export interface Receita {
  id: string;
  condominioId: string;
  tipo: string;
  descricao: string;
  valor: number;
  unidadeId?: string;
  vencimento: string;
  status: "pago" | "pendente" | "atrasado";
  dataPagamento?: string;
}

export interface Visitante {
  id: string;
  condominioId: string;
  nome: string;
  documento: string;
  unidadeId: string;
  horaEntrada: string;
  horaSaida?: string;
  tipo: "visitante" | "prestador";
  autorizadoPor?: string;
}

export interface Encomenda {
  id: string;
  condominioId: string;
  unidadeId: string;
  descricao: string;
  dataChegada: string;
  dataRetirada?: string;
  retiradoPor?: string;
  status: "pendente" | "retirado";
}

export interface Ocorrencia {
  id: string;
  condominioId: string;
  data: string;
  tipo: string;
  descricao: string;
  status: "aberta" | "em_andamento" | "resolvida";
  anexos?: string[];
}

export interface Comunicado {
  id: string;
  condominioId: string;
  titulo: string;
  conteudo: string;
  data: string;
  autor: string;
  tipo: "aviso" | "comunicado" | "urgente";
  anexo?: string;
}

export interface FinanceiroResumo {
  receitas: number;
  despesas: number;
  saldo: number;
  inadimplencia: number;
  inadimplenciaPercentual: number;
}

export type Page =
  | "acessos"
  | "dashboard"
  | "condominio"
  | "moradores"
  | "financeiro"
  | "portaria"
  | "comunicados"
  | "reservas"
  | "assembleias"
  | "manutencao"
  | "configuracoes";
