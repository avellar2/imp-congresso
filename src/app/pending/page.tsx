'use client'

import { useSearchParams } from 'next/navigation'
import { Clock } from 'lucide-react'
import Link from 'next/link'

export default function Pending() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pagamento Pendente
          </h2>
          <p className="text-gray-600 mb-6">
            Seu pagamento está sendo processado. Você receberá uma confirmação em breve.
          </p>
          <div className="space-y-4">
            <Link
              href={`/consulta?cpf=`}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium transition-colors block text-center"
            >
              Consultar Status
            </Link>
            <Link
              href="/"
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md font-medium transition-colors block text-center"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}