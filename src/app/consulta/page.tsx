'use client'

import { useState } from 'react'
import { Search, User, Calendar, CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  nome: string
  email: string
  cpf: string
  telefone: string
  createdAt: string
  pagamentos: {
    id: string
    valor: number
    status: string
    createdAt: string
  }[]
}

export default function Consulta() {
  const [cpf, setCpf] = useState('')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUserData(null)

    try {
      const response = await fetch(`/api/consulta?cpf=${encodeURIComponent(cpf)}`)
      const data = await response.json()

      if (response.ok) {
        setUserData(data.user)
      } else {
        setError(data.error || 'Usuário não encontrado')
      }
    } catch (error) {
      setError('Erro ao consultar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'PENDENTE':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'REJEITADO':
      case 'CANCELADO':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return 'text-green-600 bg-green-100'
      case 'PENDENTE':
        return 'text-yellow-600 bg-yellow-100'
      case 'REJEITADO':
      case 'CANCELADO':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Consultar Inscrição
          </h1>
          <p className="text-gray-600">
            Digite seu CPF para consultar o status da sua inscrição
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Digite seu CPF (000.000.000-00)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Buscando...' : 'Consultar'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {userData && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados da Inscrição
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Nome Completo</h3>
                  <p className="text-lg text-gray-900">{userData.nome}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                  <p className="text-lg text-gray-900">{userData.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">CPF</h3>
                  <p className="text-lg text-gray-900">{userData.cpf}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Telefone</h3>
                  <p className="text-lg text-gray-900">{userData.telefone}</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Status do Pagamento
                </h3>
                
                {userData.pagamentos.map((pagamento) => (
                  <div key={pagamento.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(pagamento.status)}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pagamento.status)}`}>
                          {pagamento.status}
                        </span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">
                        R$ {pagamento.valor.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Criado em {new Date(pagamento.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {userData.pagamentos.some(p => p.status === 'APROVADO') && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">🎉 Inscrição Confirmada!</h4>
                  <p className="text-green-700">
                    Sua inscrição foi confirmada com sucesso. Você receberá mais informações sobre o evento por email.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}