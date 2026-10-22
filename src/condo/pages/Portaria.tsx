// @ts-nocheck
import React, { useState } from 'react';
import { Plus, UserCheck, Package, AlertTriangle, Car, Clock, CheckCircle } from 'lucide-react';
import { visitantes, encomendas, ocorrencias, unidades } from '../data/mockData';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

export function Portaria() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'visitantes' | 'encomendas' | 'ocorrencias'>('visitantes');
  const [showVisitanteModal, setShowVisitanteModal] = useState(false);
  const [showEncomendaModal, setShowEncomendaModal] = useState(false);

  const isPorteiro = user?.role === 'porteiro';
  const isMorador = user?.role === 'morador';

  const getUnidadeLabel = (unidadeId: string) => {
    const u = unidades.find(un => un.id === unidadeId);
    if (!u) return '-';
    const blocoNome = u.blocoId === 'bloco-a' ? 'A' : 'B';
    return `${blocoNome}-${u.numero}`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const visitanteColumns = [
    { key: 'nome', header: 'Nome', render: (v: typeof visitantes[0]) => <span className="font-medium">{v.nome}</span> },
    { key: 'documento', header: 'Documento' },
    { key: 'unidadeId', header: 'Unidade', render: (v: typeof visitantes[0]) => getUnidadeLabel(v.unidadeId) },
    { key: 'tipo', header: 'Tipo', render: (v: typeof visitantes[0]) => (
      <Badge variant={v.tipo === 'visitante' ? 'info' : 'warning'}>{v.tipo === 'visitante' ? 'Visitante' : 'Prestador'}</Badge>
    )},
    { key: 'horaEntrada', header: 'Entrada', render: (v: typeof visitantes[0]) => formatTime(v.horaEntrada) },
    { key: 'horaSaida', header: 'Saída', render: (v: typeof visitantes[0]) => v.horaSaida ? formatTime(v.horaSaida) : <Badge variant="warning">Presente</Badge> },
  ];

  const encomendaColumns = [
    { key: 'descricao', header: 'Descrição', render: (e: typeof encomendas[0]) => <span className="font-medium">{e.descricao}</span> },
    { key: 'unidadeId', header: 'Unidade', render: (e: typeof encomendas[0]) => getUnidadeLabel(e.unidadeId) },
    { key: 'dataChegada', header: 'Chegada', render: (e: typeof encomendas[0]) => formatTime(e.dataChegada) },
    { key: 'status', header: 'Status', render: (e: typeof encomendas[0]) => (
      <Badge variant={e.status === 'pendente' ? 'warning' : 'success'}>{e.status === 'pendente' ? 'Pendente' : 'Retirado'}</Badge>
    )},
    { key: 'dataRetirada', header: 'Retirada', render: (e: typeof encomendas[0]) => e.dataRetirada ? formatTime(e.dataRetirada) : '-' },
  ];

  const statusLabel: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
    aberta: { label: 'Aberta', variant: 'danger' },
    em_andamento: { label: 'Em andamento', variant: 'warning' },
    resolvida: { label: 'Resolvida', variant: 'success' },
  };

  const ocorrenciaColumns = [
    { key: 'data', header: 'Data', render: (o: typeof ocorrencias[0]) => {
      const d = new Date(o.data);
      return d.toLocaleDateString('pt-BR');
    }},
    { key: 'tipo', header: 'Tipo', render: (o: typeof ocorrencias[0]) => <Badge variant="neutral">{o.tipo}</Badge> },
    { key: 'descricao', header: 'Descrição', render: (o: typeof ocorrencias[0]) => <span className="font-medium max-w-xs truncate block">{o.descricao}</span> },
    { key: 'status', header: 'Status', render: (o: typeof ocorrencias[0]) => {
      const s = statusLabel[o.status];
      return <Badge variant={s.variant}>{s.label}</Badge>;
    }},
  ];

  // Tablet-friendly view for porteiro
  if (isPorteiro) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portaria</h1>
          <p className="text-gray-500 dark:text-gray-400">Controle de acesso e registros</p>
        </div>

        {/* Quick action buttons - tablet friendly */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={() => setShowVisitanteModal(true)} className="flex flex-col items-center gap-3 p-6 bg-teal-50 dark:bg-teal-900/30 rounded-xl border-2 border-teal-200 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors">
            <UserCheck className="w-10 h-10 text-teal-600 dark:text-teal-400" />
            <span className="text-lg font-semibold text-teal-700 dark:text-teal-300">Registrar Visitante</span>
          </button>
          <button onClick={() => setShowEncomendaModal(true)} className="flex flex-col items-center gap-3 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
            <Package className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">Registrar Encomenda</span>
          </button>
          <button className="flex flex-col items-center gap-3 p-6 bg-orange-50 dark:bg-orange-900/30 rounded-xl border-2 border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors">
            <AlertTriangle className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            <span className="text-lg font-semibold text-orange-700 dark:text-orange-300">Nova Ocorrência</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-teal-600">{visitantes.filter(v => !v.horaSaida).length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Visitantes presentes</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-blue-600">{encomendas.filter(e => e.status === 'pendente').length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Encomendas pendentes</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-orange-600">{ocorrencias.filter(o => o.status !== 'resolvida').length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ocorrências abertas</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-purple-600">5</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Vagas ocupadas</p>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /> Atividade Recente</h3>
          <div className="space-y-3">
            {visitantes.slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className={`w-3 h-3 rounded-full ${v.horaSaida ? 'bg-gray-400' : 'bg-green-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{v.nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Un. {getUnidadeLabel(v.unidadeId)} • {v.tipo}</p>
                </div>
                <span className="text-xs text-gray-400">{formatTime(v.horaEntrada)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isMorador ? 'Encomendas & Visitantes' : 'Portaria'}</h1>
          <p className="text-gray-500 dark:text-gray-400">{isMorador ? 'Suas encomendas e autorizações de visitantes' : 'Controle de visitantes, encomendas e ocorrências'}</p>
        </div>
        {!isMorador && (
          <div className="flex gap-2">
            <button onClick={() => setShowVisitanteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Visitante
            </button>
            <button onClick={() => setShowEncomendaModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Package className="w-4 h-4" /> Encomenda
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(['visitantes', 'encomendas', 'ocorrencias'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'visitantes' ? 'Visitantes' : t === 'encomendas' ? 'Encomendas' : 'Ocorrências'}
          </button>
        ))}
      </div>

      {tab === 'visitantes' && (
        <DataTable data={visitantes} columns={visitanteColumns} searchKeys={['nome', 'documento', 'tipo']} pageSize={10} />
      )}

      {tab === 'encomendas' && (
        <div>
          {isMorador && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">Você tem <strong>{encomendas.filter(e => e.status === 'pendente').length}</strong> encomenda(s) aguardando retirada na portaria.</p>
            </div>
          )}
          <DataTable data={encomendas} columns={encomendaColumns} searchKeys={['descricao', 'status']} pageSize={10} />
        </div>
      )}

      {tab === 'ocorrencias' && (
        <DataTable data={ocorrencias} columns={ocorrenciaColumns} searchKeys={['tipo', 'descricao', 'status']} pageSize={10} />
      )}

      {/* Visitante Modal */}
      <Modal open={showVisitanteModal} onClose={() => setShowVisitanteModal(false)} title="Registrar Visitante" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Documento (RG/CPF)</label>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Visitante</option>
                <option>Prestador de serviço</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade destino</label>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {unidades.map(u => (
                  <option key={u.id} value={u.id}>{u.blocoId === 'bloco-a' ? 'Bloco A' : 'Bloco B'} - {u.numero}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autorizado por</label>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Nome do morador" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setShowVisitanteModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
            <button onClick={() => setShowVisitanteModal(false)} className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Registrar Entrada</button>
          </div>
        </div>
      </Modal>

      {/* Encomenda Modal */}
      <Modal open={showEncomendaModal} onClose={() => setShowEncomendaModal(false)} title="Registrar Encomenda">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Ex: Caixa grande - Amazon" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
            <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.blocoId === 'bloco-a' ? 'Bloco A' : 'Bloco B'} - {u.numero}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setShowEncomendaModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
            <button onClick={() => setShowEncomendaModal(false)} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Registrar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
