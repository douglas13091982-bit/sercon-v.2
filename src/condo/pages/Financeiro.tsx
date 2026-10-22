// @ts-nocheck
import React, { useState } from 'react';
import { Plus, Download, TrendingUp, TrendingDown, DollarSign, FileSpreadsheet } from 'lucide-react';
import { despesas, receitas } from '../data/mockData';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function Financeiro() {
  const [tab, setTab] = useState<'resumo' | 'despesas' | 'receitas' | 'inadimplencia'>('resumo');
  const [showModal, setShowModal] = useState(false);

  const totalReceitas = receitas.filter(r => r.status === 'pago').reduce((s, r) => s + r.valor, 0);
  const totalDespesas = despesas.filter(d => d.status === 'pago').reduce((s, d) => s + d.valor, 0);
  const saldo = totalReceitas - totalDespesas;
  const pendente = receitas.filter(r => r.status === 'pendente').reduce((s, r) => s + r.valor, 0) + despesas.filter(d => d.status === 'pendente').reduce((s, d) => s + d.valor, 0);
  const inadimplencia = 3200;

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const statusLabel: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
    pago: { label: 'Pago', variant: 'success' },
    pendente: { label: 'Pendente', variant: 'warning' },
    atrasado: { label: 'Atrasado', variant: 'danger' },
  };

  const despesaColumns = [
    { key: 'descricao', header: 'Descrição', render: (d: typeof despesas[0]) => <span className="font-medium">{d.descricao}</span> },
    { key: 'categoria', header: 'Categoria', render: (d: typeof despesas[0]) => <Badge variant="neutral">{d.categoria}</Badge> },
    { key: 'fornecedor', header: 'Fornecedor' },
    { key: 'valor', header: 'Valor', render: (d: typeof despesas[0]) => <span className="font-medium">{formatCurrency(d.valor)}</span> },
    { key: 'vencimento', header: 'Vencimento', render: (d: typeof despesas[0]) => {
      const date = new Date(d.vencimento);
      return date.toLocaleDateString('pt-BR');
    }},
    { key: 'status', header: 'Status', render: (d: typeof despesas[0]) => {
      const s = statusLabel[d.status];
      return <Badge variant={s.variant}>{s.label}</Badge>;
    }},
  ];

  const receitaColumns = [
    { key: 'descricao', header: 'Descrição', render: (r: typeof receitas[0]) => <span className="font-medium">{r.descricao}</span> },
    { key: 'tipo', header: 'Tipo', render: (r: typeof receitas[0]) => <Badge variant="info">{r.tipo}</Badge> },
    { key: 'valor', header: 'Valor', render: (r: typeof receitas[0]) => <span className="font-medium text-green-600">{formatCurrency(r.valor)}</span> },
    { key: 'vencimento', header: 'Vencimento', render: (r: typeof receitas[0]) => {
      const date = new Date(r.vencimento);
      return date.toLocaleDateString('pt-BR');
    }},
    { key: 'status', header: 'Status', render: (r: typeof receitas[0]) => {
      const s = statusLabel[r.status];
      return <Badge variant={s.variant}>{s.label}</Badge>;
    }},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-gray-500 dark:text-gray-400">Controle de receitas, despesas e inadimplência</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/30"><TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receitas</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30"><TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Despesas</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/30"><DollarSign className="w-5 h-5 text-teal-600 dark:text-teal-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saldo</p>
              <p className={`text-xl font-bold ${saldo >= 0 ? 'text-teal-600' : 'text-red-600'}`}>{formatCurrency(saldo)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/30"><FileSpreadsheet className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inadimplência</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(inadimplencia)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(['resumo', 'despesas', 'receitas', 'inadimplencia'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'resumo' ? 'Resumo' : t === 'despesas' ? 'Despesas' : t === 'receitas' ? 'Receitas' : 'Inadimplência'}
          </button>
        ))}
      </div>

      {tab === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Despesas por Categoria</h3>
            <div className="space-y-3">
              {[
                { cat: 'Folha', valor: 18500, pct: 48 },
                { cat: 'Energia', valor: 6200, pct: 16 },
                { cat: 'Água', valor: 4500, pct: 12 },
                { cat: 'Manutenção', valor: 4700, pct: 12 },
                { cat: 'Seguro', valor: 2800, pct: 7 },
                { cat: 'Outros', valor: 2090, pct: 5 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{item.cat}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.valor)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Integrações de Pagamento</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Boleto Bancário</p>
                <Badge variant="warning">Em configuração</Badge>
                <p className="text-xs text-gray-400 mt-2">Asaas / Mercado Pago</p>
              </div>
              <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Pix</p>
                <Badge variant="warning">Em configuração</Badge>
                <p className="text-xs text-gray-400 mt-2">Disponível na Fase 2</p>
              </div>
              <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-center">
                <p className="text-sm text-green-700 dark:text-green-400 mb-2">Transferência Bancária</p>
                <Badge variant="success">Ativo</Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'despesas' && (
        <DataTable data={despesas} columns={despesaColumns} searchKeys={['descricao', 'categoria', 'fornecedor', 'status']} pageSize={10} />
      )}

      {tab === 'receitas' && (
        <DataTable data={receitas} columns={receitaColumns} searchKeys={['descricao', 'tipo', 'status']} pageSize={10} />
      )}

      {tab === 'inadimplencia' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Unidades Inadimplentes</h3>
          <div className="space-y-3">
            {[
              { unidade: 'A-204', morador: 'Sandra Regina Souza', valor: 1200, meses: 1 },
              { unidade: 'B-103', morador: 'Juliana Martins', valor: 2400, meses: 2 },
              { unidade: 'A-104', morador: 'Unidade vaga', valor: 800, meses: 1 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.unidade} - {item.morador}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.meses} mês(es) em atraso</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{formatCurrency(item.valor)}</p>
                  <button className="text-xs text-teal-600 hover:text-teal-700 mt-1">Enviar lembrete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Entry Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Lançamento" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Despesa</option>
                <option>Receita</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Água</option><option>Energia</option><option>Folha</option><option>Manutenção</option><option>Limpeza</option><option>Seguro</option><option>Taxa Ordinária</option><option>Taxa Extra</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimento</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fornecedor</label>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recorrente</label>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Não</option><option>Sim</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
