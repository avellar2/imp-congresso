'use client'

import { useState, useEffect } from 'react'
import { Users, DollarSign, TrendingUp, Calendar, Download, UserPlus, Trash2, CheckCircle } from 'lucide-react'
import AddInscricaoModal from '@/components/AddInscricaoModal'

interface DashboardData {
  totalUsers: number
  totalRevenue: number
  approvedPayments: number
  pendingPayments: number
  recentRegistrations: {
    id: string
    nome: string
    email: string
    createdAt: string
    pagamentos: {
      valor: number
      status: string
      metodoPagamento: string
      acompanhantes: string[]
    }[]
  }[]
}

export default function Admin() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inscricoes-congresso-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar dados:', error)
    }
  }

  const handleApprove = async (userId: string, nome: string) => {
    setApprovingId(userId)
    try {
      const response = await fetch('/api/approve-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })

      if (!response.ok) {
        throw new Error('Erro ao aprovar pagamento')
      }

      await fetchDashboardData()
    } catch (error) {
      console.error('Erro ao aprovar pagamento:', error)
      alert('Erro ao aprovar pagamento')
    } finally {
      setApprovingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/inscricoes/${deleteConfirm.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar inscrição')
      }

      await fetchDashboardData()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao deletar inscrição:', error)
      alert('Erro ao deletar inscrição')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar dados</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-600">Congresso de Inovação - Visão Geral</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Inscrições</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Receita Líquida</p>
                <p className="text-2xl font-semibold text-gray-900">
                  R$ {((data.totalRevenue || 0) - (data.approvedPayments * 0.50)).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Bruto: R$ {(data.totalRevenue || 0).toFixed(2)} - Taxa MP: R$ {(data.approvedPayments * 0.50).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pagamentos Aprovados</p>
                <p className="text-2xl font-semibold text-gray-900">{data.approvedPayments || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pagamentos Pendentes</p>
                <p className="text-2xl font-semibold text-gray-900">{data.pendingPayments || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="mb-8 flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Inscrição Manual
          </button>
          <button
            onClick={exportData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar Dados (CSV)
          </button>
        </div>

        {/* Tabela de Inscrições */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Todas as Inscrições</h2>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acompanhantes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(data.recentRegistrations || []).map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {user.pagamentos[0]?.valor.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.pagamentos[0]?.metodoPagamento === 'PIX' ? 'bg-blue-100 text-blue-800' :
                        user.pagamentos[0]?.metodoPagamento === 'DINHEIRO' ? 'bg-green-100 text-green-800' :
                        user.pagamentos[0]?.metodoPagamento === 'CREDITO' ? 'bg-purple-100 text-purple-800' :
                        user.pagamentos[0]?.metodoPagamento === 'DEBITO' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.pagamentos[0]?.metodoPagamento || 'PIX'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.pagamentos[0]?.acompanhantes?.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-700">
                            {user.pagamentos[0].acompanhantes.length} acompanhante{user.pagamentos[0].acompanhantes.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs">
                            {user.pagamentos[0].acompanhantes.join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Nenhum</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.pagamentos[0]?.status === 'APROVADO' ? 'bg-green-100 text-green-800' :
                        user.pagamentos[0]?.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.pagamentos[0]?.status || 'PENDENTE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                      {user.pagamentos[0]?.status === 'PENDENTE' && (
                        <button
                          onClick={() => handleApprove(user.id, user.nome)}
                          disabled={approvingId === user.id}
                          className="text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                          title="Aprovar pagamento"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm({ id: user.id, nome: user.nome })}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Deletar inscrição"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Adicionar */}
        <AddInscricaoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchDashboardData}
        />

        {/* Modal de Confirmação de Delete */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja deletar a inscrição de <strong>{deleteConfirm.nome}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? 'Deletando...' : 'Deletar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}