import React from 'react';
import { Wrench, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { Badge } from '../components/Badge';

const equipamentos = [
  { id: 'eq-1', nome: 'Elevador Bloco A', tipo: 'Elevador', ultimaManutencao: '15/12/2024', proximaManutencao: '15/01/2025', status: 'alerta' as const },
  { id: 'eq-2', nome: 'Elevador Bloco B', tipo: 'Elevador', ultimaManutencao: '20/12/2024', proximaManutencao: '20/01/2025', status: 'ok' as const },
  { id: 'eq-3', nome: 'Bomba Hidráulica', tipo: 'Bomba', ultimaManutencao: '10/11/2024', proximaManutencao: '10/02/2025', status: 'ok' as const },
  { id: 'eq-4', nome: 'Portão Garagem', tipo: 'Portão', ultimaManutencao: '05/01/2025', proximaManutencao: '05/04/2025', status: 'ok' as const },
  { id: 'eq-5', nome: 'Gerador de Emergência', tipo: 'Gerador', ultimaManutencao: '01/12/2024', proximaManutencao: '01/03/2025', status: 'ok' as const },
  { id: 'eq-6', nome: 'Portão Social', tipo: 'Portão', ultimaManutencao: '18/01/2025', proximaManutencao: '18/04/2025', status: 'ok' as const },
];

const agendamentos = [
  { id: 'ag-1', equipamento: 'Elevador Bloco A', servico: 'Manutenção preventiva mensal', data: '15/01/2025', fornecedor: 'Elevadores Atlas', status: 'pendente' as const },
  { id: 'ag-2', equipamento: 'Bomba Hidráulica', servico: 'Reparo vazamento', data: '22/01/2025', fornecedor: 'Hidráulica São Paulo', status: 'agendado' as const },
  { id: 'ag-3', equipamento: 'Elevador Bloco B', servico: 'Manutenção preventiva mensal', data: '20/01/2025', fornecedor: 'Elevadores Atlas', status: 'pendente' as const },
];

export function Manutencao() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manutenção</h1>
          <p className="text-gray-500 dark:text-gray-400">Equipamentos e manutenções preventivas</p>
        </div>
      </div>

      {/* Equipment cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipamentos.map(eq => (
          <div key={eq.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  eq.status === 'alerta' ? 'bg-orange-50 dark:bg-orange-900/30' : 'bg-green-50 dark:bg-green-900/30'
                }`}>
                  <Wrench className={`w-5 h-5 ${eq.status === 'alerta' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{eq.nome}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{eq.tipo}</p>
                </div>
              </div>
              <Badge variant={eq.status === 'alerta' ? 'warning' : 'success'}>
                {eq.status === 'alerta' ? 'Atenção' : 'OK'}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Última manutenção:</span>
                <span className="text-gray-900 dark:text-white">{eq.ultimaManutencao}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Próxima:</span>
                <span className={`font-medium ${eq.status === 'alerta' ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>{eq.proximaManutencao}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> Agenda de Manutenções</h3>
        <div className="space-y-3">
          {agendamentos.map(ag => (
            <div key={ag.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${ag.status === 'pendente' ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                  <Clock className={`w-5 h-5 ${ag.status === 'pendente' ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{ag.equipamento}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{ag.servico} • {ag.fornecedor}</p>
                  <p className="text-xs text-gray-400">{ag.data}</p>
                </div>
              </div>
              <Badge variant={ag.status === 'pendente' ? 'warning' : 'info'}>
                {ag.status === 'pendente' ? 'Pendente' : 'Agendado'}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
