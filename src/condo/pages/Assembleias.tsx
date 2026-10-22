import React from 'react';
import { FileText, Calendar, Download, Upload, FolderOpen } from 'lucide-react';
import { Badge } from '../components/Badge';

const documentos = [
  { id: 'doc-1', nome: 'Convenção do Condomínio', tipo: 'Convenção', data: '15/03/2023', tamanho: '2.4 MB' },
  { id: 'doc-2', nome: 'Regimento Interno', tipo: 'Regimento', data: '15/03/2023', tamanho: '1.8 MB' },
  { id: 'doc-3', nome: 'Ata Assembleia Ordinária - Dez/2024', tipo: 'Ata', data: '20/12/2024', tamanho: '540 KB' },
  { id: 'doc-4', nome: 'Balancete Dezembro/2024', tipo: 'Balancete', data: '05/01/2025', tamanho: '320 KB' },
  { id: 'doc-5', nome: 'Balancete Novembro/2024', tipo: 'Balancete', data: '05/12/2024', tamanho: '310 KB' },
  { id: 'doc-6', nome: 'Apólice de Seguro', tipo: 'Seguro', data: '01/01/2025', tamanho: '1.2 MB' },
];

const assembleias = [
  { id: 'asm-1', titulo: 'Assembleia Ordinária - Janeiro/2025', data: '30/01/2025', horario: '19:00', local: 'Salão de Festas', status: 'agendada' as const, pauta: ['Prestação de contas 2024', 'Previsão orçamentária 2025', 'Eleição do conselho fiscal'] },
  { id: 'asm-2', titulo: 'Assembleia Extraordinária - Reforma Fachada', data: '15/12/2024', horario: '19:00', local: 'Salão de Festas', status: 'realizada' as const, pauta: ['Aprovação de obra na fachada', 'Rateio extra'] },
];

export function Assembleias() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assembleias & Documentos</h1>
          <p className="text-gray-500 dark:text-gray-400">Repositório de documentos e agendamento de assembleias</p>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><FolderOpen className="w-5 h-5" /> Documentos</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>
        <div className="space-y-2">
          {documentos.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{doc.tipo} • {doc.data} • {doc.tamanho}</p>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Assembleias */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Calendar className="w-5 h-5" /> Assembleias</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg">
            <Calendar className="w-4 h-4" /> Agendar
          </button>
        </div>
        <div className="space-y-4">
          {assembleias.map(asm => (
            <div key={asm.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{asm.titulo}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{asm.data} às {asm.horario} • {asm.local}</p>
                </div>
                <Badge variant={asm.status === 'agendada' ? 'info' : 'success'}>
                  {asm.status === 'agendada' ? 'Agendada' : 'Realizada'}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">PAUTA:</p>
                <ul className="space-y-1">
                  {asm.pauta.map((p, i) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
