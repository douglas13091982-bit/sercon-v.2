import { Condominio, Bloco, Unidade, Morador, Despesa, Receita, Visitante, Encomenda, Ocorrencia, Comunicado } from '../types';

const CONDOMINIO_ID = 'cond-001';

export const condominio: Condominio = {
  id: CONDOMINIO_ID,
  nome: 'Residencial Parque das Águas',
  cnpj: '12.345.678/0001-90',
  endereco: 'Rua das Flores, 500 - Jardim América, São Paulo - SP',
  telefone: '(11) 3456-7890',
  email: 'contato@parquedasaguas.com.br',
  totalUnidades: 20,
  blocos: []
};

export const blocos: Bloco[] = [
  { id: 'bloco-a', condominioId: CONDOMINIO_ID, nome: 'Bloco A', unidades: [] },
  { id: 'bloco-b', condominioId: CONDOMINIO_ID, nome: 'Bloco B', unidades: [] }
];

export const unidades: Unidade[] = [
  // Bloco A - 10 unidades
  { id: 'un-001', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '101', andar: 1, metragem: 65, fracaoIdeal: 5.0, status: 'ocupado', proprietarioId: 'mor-001', inquilinoId: 'mor-002' },
  { id: 'un-002', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '102', andar: 1, metragem: 65, fracaoIdeal: 5.0, status: 'ocupado', proprietarioId: 'mor-003' },
  { id: 'un-003', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '103', andar: 1, metragem: 80, fracaoIdeal: 6.2, status: 'ocupado', proprietarioId: 'mor-004' },
  { id: 'un-004', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '104', andar: 1, metragem: 80, fracaoIdeal: 6.2, status: 'vago' },
  { id: 'un-005', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '201', andar: 2, metragem: 65, fracaoIdeal: 5.0, status: 'ocupado', proprietarioId: 'mor-005', inquilinoId: 'mor-006' },
  { id: 'un-006', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '202', andar: 2, metragem: 65, fracaoIdeal: 5.0, status: 'ocupado', proprietarioId: 'mor-007' },
  { id: 'un-007', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '203', andar: 2, metragem: 80, fracaoIdeal: 6.2, status: 'ocupado', proprietarioId: 'mor-008' },
  { id: 'un-008', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '204', andar: 2, metragem: 80, fracaoIdeal: 6.2, status: 'venda' },
  { id: 'un-009', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '301', andar: 3, metragem: 65, fracaoIdeal: 5.0, status: 'ocupado', proprietarioId: 'mor-009' },
  { id: 'un-010', condominioId: CONDOMINIO_ID, blocoId: 'bloco-a', numero: '302', andar: 3, metragem: 65, fracaoIdeal: 5.0, status: 'ocupado', proprietarioId: 'mor-010' },
  // Bloco B - 10 unidades
  { id: 'un-011', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '101', andar: 1, metragem: 70, fracaoIdeal: 5.4, status: 'ocupado', proprietarioId: 'mor-011', inquilinoId: 'mor-012' },
  { id: 'un-012', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '102', andar: 1, metragem: 70, fracaoIdeal: 5.4, status: 'ocupado', proprietarioId: 'mor-013' },
  { id: 'un-013', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '103', andar: 1, metragem: 85, fracaoIdeal: 6.5, status: 'ocupado', proprietarioId: 'mor-014' },
  { id: 'un-014', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '104', andar: 1, metragem: 85, fracaoIdeal: 6.5, status: 'ocupado', proprietarioId: 'mor-015' },
  { id: 'un-015', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '201', andar: 2, metragem: 70, fracaoIdeal: 5.4, status: 'ocupado', proprietarioId: 'mor-016' },
  { id: 'un-016', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '202', andar: 2, metragem: 70, fracaoIdeal: 5.4, status: 'vago' },
  { id: 'un-017', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '203', andar: 2, metragem: 85, fracaoIdeal: 6.5, status: 'ocupado', proprietarioId: 'mor-017' },
  { id: 'un-018', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '204', andar: 2, metragem: 85, fracaoIdeal: 6.5, status: 'ocupado', proprietarioId: 'mor-018', inquilinoId: 'mor-019' },
  { id: 'un-019', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '301', andar: 3, metragem: 70, fracaoIdeal: 5.4, status: 'ocupado', proprietarioId: 'mor-020' },
  { id: 'un-020', condominioId: CONDOMINIO_ID, blocoId: 'bloco-b', numero: '302', andar: 3, metragem: 70, fracaoIdeal: 5.4, status: 'ocupado', proprietarioId: 'mor-021' },
];

export const moradores: Morador[] = [
  { id: 'mor-001', condominioId: CONDOMINIO_ID, nome: 'Carlos Eduardo Silva', cpf: '123.456.789-00', telefone: '(11) 99876-5432', email: 'carlos@email.com', tipo: 'proprietario', unidadeId: 'un-001', veiculos: [{ marca: 'Toyota', modelo: 'Corolla', placa: 'ABC-1234', cor: 'Prata', vaga: 'A-01' }], pets: [{ nome: 'Rex', tipo: 'Cachorro', raca: 'Labrador' }] },
  { id: 'mor-002', condominioId: CONDOMINIO_ID, nome: 'Ana Paula Santos', cpf: '234.567.890-11', telefone: '(11) 99765-4321', email: 'ana@email.com', tipo: 'inquilino', unidadeId: 'un-001', contrato: { inicio: '2024-01-15', fim: '2025-12-31', imobiliária: 'Imobiliária Boa Vista', valor: 2500 } },
  { id: 'mor-003', condominioId: CONDOMINIO_ID, nome: 'Roberto Mendes', cpf: '345.678.901-22', telefone: '(11) 99654-3210', email: 'roberto@email.com', tipo: 'proprietario', unidadeId: 'un-002', veiculos: [{ marca: 'Honda', modelo: 'Civic', placa: 'DEF-5678', cor: 'Preto', vaga: 'A-02' }] },
  { id: 'mor-004', condominioId: CONDOMINIO_ID, nome: 'Maria Fernanda Costa', cpf: '456.789.012-33', telefone: '(11) 99543-2109', email: 'maria@email.com', tipo: 'proprietario', unidadeId: 'un-003', pets: [{ nome: 'Mimi', tipo: 'Gato', raca: 'Persa' }] },
  { id: 'mor-005', condominioId: CONDOMINIO_ID, nome: 'José Antonio Oliveira', cpf: '567.890.123-44', telefone: '(11) 99432-1098', email: 'jose@email.com', tipo: 'proprietario', unidadeId: 'un-005', veiculos: [{ marca: 'Volkswagen', modelo: 'T-Cross', placa: 'GHI-9012', cor: 'Branco', vaga: 'A-05' }] },
  { id: 'mor-006', condominioId: CONDOMINIO_ID, nome: 'Luciana Ferreira', cpf: '678.901.234-55', telefone: '(11) 99321-0987', email: 'luciana@email.com', tipo: 'inquilino', unidadeId: 'un-005', contrato: { inicio: '2024-06-01', fim: '2026-05-31', valor: 2200 } },
  { id: 'mor-007', condominioId: CONDOMINIO_ID, nome: 'Pedro Henrique Almeida', cpf: '789.012.345-66', telefone: '(11) 99210-9876', email: 'pedro@email.com', tipo: 'proprietario', unidadeId: 'un-006' },
  { id: 'mor-008', condominioId: CONDOMINIO_ID, nome: 'Sandra Regina Souza', cpf: '890.123.456-77', telefone: '(11) 99109-8765', email: 'sandra@email.com', tipo: 'proprietario', unidadeId: 'un-007', veiculos: [{ marca: 'Chevrolet', modelo: 'Tracker', placa: 'JKL-3456', cor: 'Vermelho', vaga: 'A-07' }], pets: [{ nome: 'Thor', tipo: 'Cachorro', raca: 'Golden' }] },
  { id: 'mor-009', condominioId: CONDOMINIO_ID, nome: 'Fernando Lima', cpf: '901.234.567-88', telefone: '(11) 99098-7654', email: 'fernando@email.com', tipo: 'proprietario', unidadeId: 'un-009' },
  { id: 'mor-010', condominioId: CONDOMINIO_ID, nome: 'Beatriz Gonçalves', cpf: '012.345.678-99', telefone: '(11) 98987-6543', email: 'beatriz@email.com', tipo: 'proprietario', unidadeId: 'un-010', pets: [{ nome: 'Luna', tipo: 'Gato', raca: 'Siamês' }] },
  { id: 'mor-011', condominioId: CONDOMINIO_ID, nome: 'Ricardo Barbosa', cpf: '111.222.333-44', telefone: '(11) 98876-5432', email: 'ricardo@email.com', tipo: 'proprietario', unidadeId: 'un-011', veiculos: [{ marca: 'Fiat', modelo: 'Pulse', placa: 'MNO-7890', cor: 'Azul', vaga: 'B-01' }] },
  { id: 'mor-012', condominioId: CONDOMINIO_ID, nome: 'Camila Rodrigues', cpf: '222.333.444-55', telefone: '(11) 98765-4321', email: 'camila@email.com', tipo: 'inquilino', unidadeId: 'un-011', contrato: { inicio: '2024-03-01', fim: '2025-08-31', valor: 2800 } },
  { id: 'mor-013', condominioId: CONDOMINIO_ID, nome: 'Marcos Vinícius Pereira', cpf: '333.444.555-66', telefone: '(11) 98654-3210', email: 'marcos@email.com', tipo: 'proprietario', unidadeId: 'un-012' },
  { id: 'mor-014', condominioId: CONDOMINIO_ID, nome: 'Juliana Martins', cpf: '444.555.666-77', telefone: '(11) 98543-2109', email: 'juliana@email.com', tipo: 'proprietario', unidadeId: 'un-013', pets: [{ nome: 'Bob', tipo: 'Cachorro', raca: 'Bulldog' }] },
  { id: 'mor-015', condominioId: CONDOMINIO_ID, nome: 'André Luiz Carvalho', cpf: '555.666.777-88', telefone: '(11) 98432-1098', email: 'andre@email.com', tipo: 'proprietario', unidadeId: 'un-014', veiculos: [{ marca: 'Hyundai', modelo: 'Creta', placa: 'PQR-1234', cor: 'Cinza', vaga: 'B-04' }] },
  { id: 'mor-016', condominioId: CONDOMINIO_ID, nome: 'Patrícia Nunes', cpf: '666.777.888-99', telefone: '(11) 98321-0987', email: 'patricia@email.com', tipo: 'proprietario', unidadeId: 'un-015' },
  { id: 'mor-017', condominioId: CONDOMINIO_ID, nome: 'Gustavo Henrique Dias', cpf: '777.888.999-00', telefone: '(11) 98210-9876', email: 'gustavo@email.com', tipo: 'proprietario', unidadeId: 'un-017' },
  { id: 'mor-018', condominioId: CONDOMINIO_ID, nome: 'Tatiana Moreira', cpf: '888.999.000-11', telefone: '(11) 98109-8765', email: 'tatiana@email.com', tipo: 'proprietario', unidadeId: 'un-018' },
  { id: 'mor-019', condominioId: CONDOMINIO_ID, nome: 'Rafael Augusto Pinto', cpf: '999.000.111-22', telefone: '(11) 98098-7654', email: 'rafael@email.com', tipo: 'inquilino', unidadeId: 'un-018', contrato: { inicio: '2024-09-01', fim: '2026-08-31', valor: 3000 } },
  { id: 'mor-020', condominioId: CONDOMINIO_ID, nome: 'Vanessa Cristina Ramos', cpf: '000.111.222-33', telefone: '(11) 97987-6543', email: 'vanessa@email.com', tipo: 'proprietario', unidadeId: 'un-019', pets: [{ nome: 'Mel', tipo: 'Cachorro', raca: 'Poodle' }] },
  { id: 'mor-021', condominioId: CONDOMINIO_ID, nome: 'Diego Fernandes', cpf: '111.333.555-77', telefone: '(11) 97876-5432', email: 'diego@email.com', tipo: 'proprietario', unidadeId: 'un-020', veiculos: [{ marca: 'Renault', modelo: 'Kwid', placa: 'STU-5678', cor: 'Amarelo', vaga: 'B-10' }] },
];

export const despesas: Despesa[] = [
  { id: 'desp-001', condominioId: CONDOMINIO_ID, categoria: 'Água', descricao: 'Conta de água - mês corrente', fornecedor: 'SABESP', valor: 4500, vencimento: '2025-01-10', status: 'pago', recorrente: true, dataPagamento: '2025-01-08' },
  { id: 'desp-002', condominioId: CONDOMINIO_ID, categoria: 'Energia', descricao: 'Conta de energia elétrica', fornecedor: 'ENEL', valor: 6200, vencimento: '2025-01-15', status: 'pago', recorrente: true, dataPagamento: '2025-01-14' },
  { id: 'desp-003', condominioId: CONDOMINIO_ID, categoria: 'Folha', descricao: 'Folha de pagamento - funcionários', fornecedor: 'Funcionários', valor: 18500, vencimento: '2025-01-05', status: 'pago', recorrente: true, dataPagamento: '2025-01-05' },
  { id: 'desp-004', condominioId: CONDOMINIO_ID, categoria: 'Manutenção', descricao: 'Manutenção preventiva elevadores', fornecedor: 'Elevadores Atlas', valor: 3200, vencimento: '2025-01-20', status: 'pendente', recorrente: true },
  { id: 'desp-005', condominioId: CONDOMINIO_ID, categoria: 'Limpeza', descricao: 'Produtos de limpeza', fornecedor: 'Limpeza Express', valor: 890, vencimento: '2025-01-25', status: 'pendente', recorrente: true },
  { id: 'desp-006', condominioId: CONDOMINIO_ID, categoria: 'Seguro', descricao: 'Seguro do condomínio', fornecedor: 'Porto Seguro', valor: 2800, vencimento: '2025-02-01', status: 'pendente', recorrente: true },
  { id: 'desp-007', condominioId: CONDOMINIO_ID, categoria: 'Manutenção', descricao: 'Reparo bomba hidráulica', fornecedor: 'Hidráulica São Paulo', valor: 1500, vencimento: '2025-01-18', status: 'atrasado', recorrente: false },
  { id: 'desp-008', condominioId: CONDOMINIO_ID, categoria: 'Jardim', descricao: 'Manutenção paisagismo', fornecedor: 'Jardins & Flores', valor: 1200, vencimento: '2025-01-30', status: 'pendente', recorrente: true },
];

export const receitas: Receita[] = [
  { id: 'rec-001', condominioId: CONDOMINIO_ID, tipo: 'Taxa Ordinária', descricao: 'Taxa condominial - Janeiro/2025', valor: 45000, vencimento: '2025-01-10', status: 'pago', dataPagamento: '2025-01-09' },
  { id: 'rec-002', condominioId: CONDOMINIO_ID, tipo: 'Taxa Extra', descricao: 'Taxa extra - Reforma fachada', valor: 5000, vencimento: '2025-01-10', status: 'pago', dataPagamento: '2025-01-10' },
  { id: 'rec-003', condominioId: CONDOMINIO_ID, tipo: 'Fundo de Reserva', descricao: 'Fundo de reserva - Janeiro', valor: 3000, vencimento: '2025-01-10', status: 'pago', dataPagamento: '2025-01-08' },
  { id: 'rec-004', condominioId: CONDOMINIO_ID, tipo: 'Taxa Ordinária', descricao: 'Taxa condominial - Fevereiro/2025', valor: 45000, vencimento: '2025-02-10', status: 'pendente' },
  { id: 'rec-005', condominioId: CONDOMINIO_ID, tipo: 'Multa', descricao: 'Multa por barulho - Un. 203', valor: 350, vencimento: '2025-01-20', status: 'pendente' },
  { id: 'rec-006', condominioId: CONDOMINIO_ID, tipo: 'Reserva', descricao: 'Aluguel salão de festas - Janeiro', valor: 400, vencimento: '2025-01-05', status: 'pago', dataPagamento: '2025-01-03' },
];

export const visitantes: Visitante[] = [
  { id: 'vis-001', condominioId: CONDOMINIO_ID, nome: 'João Pedro Souza', documento: 'RG 12.345.678', unidadeId: 'un-001', horaEntrada: '2025-01-20T14:30:00', horaSaida: '2025-01-20T18:00:00', tipo: 'visitante', autorizadoPor: 'Carlos Eduardo Silva' },
  { id: 'vis-002', condominioId: CONDOMINIO_ID, nome: 'Manutenção Ar Condicionado', documento: 'CNPJ 98.765.432/0001-10', unidadeId: 'un-007', horaEntrada: '2025-01-20T09:00:00', horaSaida: '2025-01-20T12:00:00', tipo: 'prestador' },
  { id: 'vis-003', condominioId: CONDOMINIO_ID, nome: 'Maria Aparecida Lima', documento: 'RG 87.654.321', unidadeId: 'un-011', horaEntrada: '2025-01-21T10:00:00', tipo: 'visitante', autorizadoPor: 'Ricardo Barbosa' },
  { id: 'vis-004', condominioId: CONDOMINIO_ID, nome: 'Entregador Mercado Livre', documento: 'CTPS 11.222.333', unidadeId: 'un-003', horaEntrada: '2025-01-21T11:30:00', horaSaida: '2025-01-21T11:45:00', tipo: 'prestador' },
];

export const encomendas: Encomenda[] = [
  { id: 'enc-001', condominioId: CONDOMINIO_ID, unidadeId: 'un-001', descricao: 'Caixa grande - Amazon', dataChegada: '2025-01-21T08:30:00', status: 'pendente' },
  { id: 'enc-002', condominioId: CONDOMINIO_ID, unidadeId: 'un-005', descricao: 'Envelope - Correios (AR)', dataChegada: '2025-01-21T09:15:00', status: 'pendente' },
  { id: 'enc-003', condominioId: CONDOMINIO_ID, unidadeId: 'un-011', descricao: 'Pacote médio - Shopee', dataChegada: '2025-01-20T14:00:00', dataRetirada: '2025-01-20T19:30:00', retiradoPor: 'Ricardo Barbosa', status: 'retirado' },
  { id: 'enc-004', condominioId: CONDOMINIO_ID, unidadeId: 'un-014', descricao: 'Caixa pequena - Magazine Luiza', dataChegada: '2025-01-21T10:00:00', status: 'pendente' },
  { id: 'enc-005', condominioId: CONDOMINIO_ID, unidadeId: 'un-008', descricao: 'Documento - DHL', dataChegada: '2025-01-21T11:00:00', status: 'pendente' },
];

export const ocorrencias: Ocorrencia[] = [
  { id: 'oco-001', condominioId: CONDOMINIO_ID, data: '2025-01-20', tipo: 'Barulho', descricao: 'Barulho excessivo na unidade 203 após as 22h', status: 'aberta' },
  { id: 'oco-002', condominioId: CONDOMINIO_ID, data: '2025-01-19', tipo: 'Manutenção', descricao: 'Vazamento no garage - Bloco B', status: 'em_andamento' },
  { id: 'oco-003', condominioId: CONDOMINIO_ID, data: '2025-01-18', tipo: 'Segurança', descricao: 'Portão da garagem com defeito intermitente', status: 'resolvida' },
  { id: 'oco-004', condominioId: CONDOMINIO_ID, data: '2025-01-21', tipo: 'Animal', descricao: 'Animal solto na área comum - Bloco A', status: 'aberta' },
];

export const comunicados: Comunicado[] = [
  { id: 'com-001', condominioId: CONDOMINIO_ID, titulo: 'Manutenção dos Elevadores', conteudo: 'Informamos que no dia 25/01 os elevadores do Bloco A passarão por manutenção preventiva das 8h às 12h. Pedimos a compreensão de todos.', data: '2025-01-20', autor: 'Carlos Eduardo Silva', tipo: 'aviso' },
  { id: 'com-002', condominioId: CONDOMINIO_ID, titulo: 'Assembleia Ordinária', conteudo: 'Convocamos todos os condôminos para a Assembleia Ordinária que será realizada no dia 30/01/2025 às 19h no salão de festas. Pauta: prestação de contas e eleição.', data: '2025-01-18', autor: 'Carlos Eduardo Silva', tipo: 'comunicado' },
  { id: 'com-003', condominioId: CONDOMINIO_ID, titulo: '⚠️ Falta de Água Programada', conteudo: 'A SABESP informou que haverá interrupção no fornecimento de água no dia 22/01 das 8h às 18h. Recomendamos armazenar água para uso.', data: '2025-01-21', autor: 'Carlos Eduardo Silva', tipo: 'urgente' },
  { id: 'com-004', condominioId: CONDOMINIO_ID, titulo: 'Horário da Piscina', conteudo: 'A partir de fevereiro, a piscina funcionará de segunda a sábado das 7h às 21h e domingos das 8h às 18h.', data: '2025-01-15', autor: 'Carlos Eduardo Silva', tipo: 'aviso' },
];

export const dadosMensais = [
  { mes: 'Fev', receitas: 48000, despesas: 32000 },
  { mes: 'Mar', receitas: 50000, despesas: 35000 },
  { mes: 'Abr', receitas: 47000, despesas: 31000 },
  { mes: 'Mai', receitas: 49000, despesas: 33000 },
  { mes: 'Jun', receitas: 51000, despesas: 34000 },
  { mes: 'Jul', receitas: 48500, despesas: 36000 },
  { mes: 'Ago', receitas: 50000, despesas: 32500 },
  { mes: 'Set', receitas: 49500, despesas: 33500 },
  { mes: 'Out', receitas: 52000, despesas: 35500 },
  { mes: 'Nov', receitas: 48000, despesas: 34000 },
  { mes: 'Dez', receitas: 53000, despesas: 38000 },
  { mes: 'Jan', receitas: 53400, despesas: 38790 },
];

export const inadimplenciaMensal = [
  { mes: 'Fev', valor: 2500 },
  { mes: 'Mar', valor: 1800 },
  { mes: 'Abr', valor: 3200 },
  { mes: 'Mai', valor: 1500 },
  { mes: 'Jun', valor: 2800 },
  { mes: 'Jul', valor: 4100 },
  { mes: 'Ago', valor: 2200 },
  { mes: 'Set', valor: 1900 },
  { mes: 'Out', valor: 3500 },
  { mes: 'Nov', valor: 2700 },
  { mes: 'Dez', valor: 4800 },
  { mes: 'Jan', valor: 3200 },
];

export const categoriasDespesa = ['Água', 'Energia', 'Folha', 'Manutenção', 'Limpeza', 'Seguro', 'Jardim', 'Elevador', 'Administrativo', 'Outros'];
