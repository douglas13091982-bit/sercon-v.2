// @ts-nocheck
import React, { useState } from 'react';
import { Plus, Megaphone, AlertCircle, Info, Paperclip, Send } from 'lucide-react';
import { comunicados } from '../data/mockData';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function Comunicados() {
  const [showModal, setShowModal] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState<typeof comunicados[0] | null>(null);

  const tipoConfig: Record<string, { icon: React.ReactNode; variant: 'danger' | 'warning' | 'info'; label: string }> = {
    urgente: { icon: <AlertCircle className="w-5 h-5" />, variant: 'danger', label: 'Urgente' },
    aviso: { icon: <Megaphone className="w-5 h-5" />, variant: 'warning', label: 'Aviso' },
    comunicado: { icon: <Info className="w-5 h-5" />, variant: 'info', label: 'Comunicado' },
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comunicados</h1>
          <p className="text-gray-500 dark:text-gray-400">Mural de avisos e comunicados do condomínio</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Comunicado
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">Todos</button>
        <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">Urgentes</button>
        <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">Avisos</button>
        <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">Comunicados</button>
      </div>

      {/* Comunicados list */}
      <div className="space-y-4">
        {comunicados.map(c => {
          const config = tipoConfig[c.tipo];
          return (
            <div
              key={c.id}
              onClick={() => setSelectedComunicado(c)}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg ${
                  config.variant === 'danger' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                  config.variant === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                  'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{c.titulo}</h3>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{c.conteudo}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(c.data)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Por: {c.autor}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedComunicado} onClose={() => setSelectedComunicado(null)} title={selectedComunicado?.titulo || ''} size="lg">
        {selectedComunicado && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={tipoConfig[selectedComunicado.tipo].variant}>{tipoConfig[selectedComunicado.tipo].label}</Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(selectedComunicado.data)} • Por: {selectedComunicado.autor}</span>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{selectedComunicado.conteudo}</p>
            </div>
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Paperclip className="w-4 h-4" /> Anexar arquivo
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg">
                <Send className="w-4 h-4" /> Enviar por e-mail
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Comunicado Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Comunicado" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
            <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="aviso">Aviso</option>
              <option value="comunicado">Comunicado</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
            <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conteúdo</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={5} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anexo</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Arraste um arquivo ou clique para selecionar</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" defaultChecked />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enviar por e-mail</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" defaultChecked />
              <span className="text-sm text-gray-700 dark:text-gray-300">Notificar no app</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg">Publicar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
