'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface AddInscricaoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddInscricaoModal({ isOpen, onClose, onSuccess }: AddInscricaoModalProps) {
  const [loading, setLoading] = useState(false)
  const [acompanhantes, setAcompanhantes] = useState<string[]>([''])
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    valor: '',
    metodoPagamento: 'DINHEIRO',
    status: 'APROVADO'
  })

  if (!isOpen) return null

  const handleAddAcompanhante = () => {
    setAcompanhantes([...acompanhantes, ''])
  }

  const handleRemoveAcompanhante = (index: number) => {
    setAcompanhantes(acompanhantes.filter((_, i) => i !== index))
  }

  const handleAcompanhanteChange = (index: number, value: string) => {
    const newAcompanhantes = [...acompanhantes]
    newAcompanhantes[index] = value
    setAcompanhantes(newAcompanhantes)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const acompanhantesLimpos = acompanhantes.filter(a => a.trim() !== '')

      const response = await fetch('/api/admin/inscricoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor),
          acompanhantes: acompanhantesLimpos,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao adicionar inscrição')
      }

      // Resetar formulário
      setFormData({
        nome: '',
        email: '',
        cpf: '',
        telefone: '',
        valor: '',
        metodoPagamento: 'DINHEIRO',
        status: 'APROVADO'
      })
      setAcompanhantes([''])

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao adicionar inscrição:', error)
      alert(error instanceof Error ? error.message : 'Erro ao adicionar inscrição')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Adicionar Inscrição Manual</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="João da Silva"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF *
            </label>
            <input
              type="text"
              required
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              placeholder="000.000.000-00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone *
            </label>
            <input
              type="text"
              required
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor *
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pagamento *
            </label>
            <select
              required
              value={formData.metodoPagamento}
              onChange={(e) => setFormData({ ...formData, metodoPagamento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CREDITO">Crédito</option>
              <option value="DEBITO">Débito</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status do Pagamento *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="APROVADO">Aprovado</option>
              <option value="PENDENTE">Pendente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acompanhantes
            </label>
            <div className="space-y-2">
              {acompanhantes.map((acompanhante, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={acompanhante}
                    onChange={(e) => handleAcompanhanteChange(index, e.target.value)}
                    placeholder="Nome do acompanhante"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
                  />
                  {acompanhantes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAcompanhante(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddAcompanhante}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Adicionar Acompanhante
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
