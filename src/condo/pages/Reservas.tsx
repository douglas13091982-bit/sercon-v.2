import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle, Plus } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

const espacos = [
  { id: 'esp-1', nome: 'Salão de Festas', capacidade: 50, taxa: 200, horario: '10h às 22h' },
  { id: 'esp-2', nome: 'Churrasqueira', capacidade: 20, taxa: 100, horario: '10h às 22h' },
  { id: 'esp-3', nome: 'Quadra Poliesportiva', capacidade: 20, taxa: 0, horario: '7h às 21h' },
  { id: 'esp-4', nome: 'Piscina', capacidade: 30, taxa: 0, horario: '7h às 20h' },
];

const reservas = [
  { id: 'res-1', espaco: 'Salão de Festas', morador: 'Carlos Eduardo Silva', unidade: 'A-101', data: '25/01/2025', horario: '14h às 22h', status: 'aprovada' as const },
  { id: 'res-2', espaco: 'Churrasqueira', morador: 'Roberto Mendes', unidade: 'A-102', data: '26/01/2025', horario: '12h às 18h', status: 'pendente' as const },
  { id: 'res-3', espaco: 'Quadra Poliesportiva', morador: 'Pedro Henrique Almeida', unidade: 'A-202', data: '27/01/2025', horario: '18h às 20h', status: 'aprovada' as const },
  { id: 'res-4', espaco: 'Salão de Festas', morador: 'Juliana Martins', unidade: 'B-103', data: '01/02/2025', horario: '15h às 23h', status: 'pendente' as const },
];

export function Reservas() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Áreas Comuns & Reservas</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie os espaços e reservas do condomínio</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nova Reserva
        </button>
      </div>

      {/* Spaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {espacos.map(esp => (
          <div key={esp.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{esp.nome}</h3>
            </div>
            <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
              <p className="flex items-center gap-2"><Users className="w-4 h-4" /> Capacidade: {esp.capacidade} pessoas</p>
              <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> {esp.horario}</p>
              <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Taxa: {esp.taxa > 0 ? `R$ ${esp.taxa}` : 'Gratuito'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reservations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reservas</h3>
        <div className="space-y-3">
          {reservas.map(r => (
            <div key={r.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{r.espaco}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{r.morador} • Un. {r.unidade}</p>
                  <p className="text-xs text-gray-400">{r.data} • {r.horario}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === 'aprovada' ? 'success' : 'warning'}>
                  {r.status === 'aprovada' ? 'Aprovada' : 'Pendente'}
                </Badge>
                {r.status === 'pendente' && (
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"><CheckCircle className="w-4 h-4" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"><XCircle className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Reserva">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Espaço</label>
            <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {espacos.map(e => <option key={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
            <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário início</label>
              <input type="time" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário fim</label>
              <input type="time" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Evento</label>
            <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Ex: Aniversário" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg">Solicitar Reserva</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
