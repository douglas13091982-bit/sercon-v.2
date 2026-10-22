import React from 'react';
import { Settings, CreditCard, Users, Shield, Building2, Check } from 'lucide-react';
import { Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';

const planos = [
  { nome: 'Básico', unidades: 'Até 20', preco: 149, features: ['Dashboard', 'Moradores', 'Portaria', 'Comunicados', 'Financeiro básico'], popular: false },
  { nome: 'Pro', unidades: 'Até 50', preco: 299, features: ['Tudo do Básico', 'Reservas', 'Chamados', 'Assembleias', 'Relatórios PDF', 'Suporte prioritário'], popular: true },
  { nome: 'Premium', unidades: 'Ilimitado', preco: 499, features: ['Tudo do Pro', 'Manutenção', 'Enquetes', 'App mobile PWA', 'API de integração', 'Gerente de conta'], popular: false },
];

const condominios = [
  { id: 'c-1', nome: 'Residencial Parque das Águas', plano: 'Pro', unidades: 20, status: 'ativo', inicio: '01/10/2024' },
  { id: 'c-2', nome: 'Edifício Jardim Europa', plano: 'Básico', unidades: 12, status: 'trial', inicio: '15/01/2025' },
  { id: 'c-3', nome: 'Condomínio Vila Verde', plano: 'Premium', unidades: 80, status: 'ativo', inicio: '01/06/2024' },
  { id: 'c-4', nome: 'Residencial Sol Nascente', plano: 'Pro', unidades: 35, status: 'inadimplente', inicio: '01/08/2024' },
];

export function Configuracoes() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel Super Admin</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie condomínios clientes, planos e assinaturas</p>
        </div>

        {/* Plans */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Planos de Assinatura</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planos.map(plano => (
              <div key={plano.nome} className={`relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border ${plano.popular ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-gray-100 dark:border-gray-700'}`}>
                {plano.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">MAIS POPULAR</div>
                )}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plano.nome}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{plano.unidades} unidades</p>
                <div className="my-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">R$ {plano.preco}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/mês</span>
                </div>
                <ul className="space-y-2">
                  {plano.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="w-4 h-4 text-teal-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Condomínios */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Condomínios Clientes</h3>
          <div className="space-y-3">
            {condominios.map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{c.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.unidades} unidades • Plano {c.plano} • Desde {c.inicio}</p>
                  </div>
                </div>
                <Badge variant={c.status === 'ativo' ? 'success' : c.status === 'trial' ? 'info' : 'danger'}>
                  {c.status === 'ativo' ? 'Ativo' : c.status === 'trial' ? 'Trial' : 'Inadimplente'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-gray-500 dark:text-gray-400">Configurações do condomínio e conta</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Plano Atual</h3>
          <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-teal-700 dark:text-teal-300">Plano Pro</p>
                <p className="text-sm text-teal-600 dark:text-teal-400">Até 50 unidades • R$ 299/mês</p>
              </div>
              <Badge variant="success">Ativo</Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Próxima cobrança: 01/02/2025</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Usuários</h3>
          <div className="space-y-3">
            {[
              { nome: 'Carlos Eduardo Silva', papel: 'Síndico', email: 'sindico@condominio.com' },
              { nome: 'Sebastião Oliveira', papel: 'Porteiro', email: 'porteiro@condominio.com' },
            ].map((u, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{u.nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                </div>
                <Badge variant="neutral">{u.papel}</Badge>
              </div>
            ))}
          </div>
          <button className="mt-3 w-full py-2 text-sm font-medium text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30">
            + Convidar usuário
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5" /> Segurança & LGPD</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Autenticação em dois fatores</span>
              <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Logs de auditoria</span>
              <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Consentimento LGPD</span>
              <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" defaultChecked />
            </label>
          </div>
          <button className="mt-4 w-full py-2 text-sm font-medium text-red-600 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
            Exportar/Excluir dados (LGPD)
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Integrações</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">E-mail (SMTP)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notificações por e-mail</p>
              </div>
              <Badge variant="success">Configurado</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">WhatsApp</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notificações via WhatsApp</p>
              </div>
              <Badge variant="warning">Em breve</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Boleto/Pix</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Asaas / Mercado Pago</p>
              </div>
              <Badge variant="warning">Em configuração</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
