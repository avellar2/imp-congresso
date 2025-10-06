'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Clock } from 'lucide-react'

export default function Home() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: ''
  })

  const [cardData, setCardData] = useState({
    cardNumber: '',
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
    cardholderName: ''
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix'>('credit')
  const [showPixPayment, setShowPixPayment] = useState(false)
  const [pixData, setPixData] = useState<{qrCode: string, qrCodeText?: string, paymentId?: string, temporaryData?: Record<string, unknown>} | null>(null)
  const [acompanhantes, setAcompanhantes] = useState<Array<{nome: string}>>([])
  const [checkingPixPayment, setCheckingPixPayment] = useState(false)

  const TAXA_INSCRICAO = 50
  const valorTotal = (1 + acompanhantes.length) * TAXA_INSCRICAO

  // Função para verificar status do pagamento PIX
  const checkPixPaymentStatus = async (paymentId: string) => {
    try {
      console.log('🔍 Verificando status do pagamento PIX:', paymentId)

      const response = await fetch('/api/check-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId })
      })

      const data = await response.json()
      console.log('📊 Status retornado:', data)

      if (data.success && data.dbStatus === 'APROVADO') {
        console.log('✅ Pagamento PIX aprovado! Redirecionando...')
        setCheckingPixPayment(false)
        window.location.href = `/success?userId=${data.userId}`
        return true
      }

      return false
    } catch (error) {
      console.error('❌ Erro ao verificar pagamento:', error)
      return false
    }
  }

  // useEffect para polling do pagamento PIX
  useEffect(() => {
    if (showPixPayment && pixData?.paymentId && !checkingPixPayment) {
      setCheckingPixPayment(true)

      // Verificar a cada 3 segundos por até 10 minutos (200 tentativas)
      let attempts = 0
      const maxAttempts = 200

      const intervalId = setInterval(async () => {
        attempts++
        console.log(`🔄 Tentativa ${attempts}/${maxAttempts}`)

        const approved = await checkPixPaymentStatus(pixData.paymentId as string)

        if (approved || attempts >= maxAttempts) {
          clearInterval(intervalId)
          if (attempts >= maxAttempts) {
            console.log('⏰ Tempo limite de verificação atingido')
            setCheckingPixPayment(false)
          }
        }
      }, 3000)

      // Limpar intervalo quando o componente for desmontado
      return () => clearInterval(intervalId)
    }
  }, [showPixPayment, pixData, checkingPixPayment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Iniciando submissão do formulário')
    console.log('📋 Dados do formulário:', formData)

    setIsLoading(true)
    setError('')

    try {
      let payloadData: Record<string, unknown> = {
        ...formData,
        paymentMethod: paymentMethod,
        installments: 1,
        issuer_id: null,
        acompanhantes: acompanhantes,
        valorTotal: valorTotal
      }

      // Validar e preparar dados baseado no método de pagamento
      if (paymentMethod === 'pix') {
        // PIX não precisa de dados do cartão
        payloadData = {
          ...payloadData,
          token: null
        }
      } else {
        // Validar dados do cartão para crédito e débito
        if (!cardData.cardNumber || !cardData.cardholderName || !cardData.expirationMonth ||
            !cardData.expirationYear || !cardData.securityCode) {
          setError('Todos os dados do cartão são obrigatórios')
          setIsLoading(false)
          return
        }

        // Para ambiente de teste, simular token baseado nos dados do cartão
        const token = `card_token_${cardData.cardNumber.replace(/\s/g, '')}_${Date.now()}`

        payloadData = {
          ...payloadData,
          ...cardData,
          token: token,
          installments: paymentMethod === 'credit' ? 1 : 1 // Débito sempre 1x
        }
      }

      console.log('📦 Payload sendo enviado:', payloadData)

      console.log('🌐 Fazendo requisição para /api/payment...')

      // Adicionar timeout para evitar travamento
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      console.log('✅ Requisição completada!')

      console.log('📡 Resposta recebida:', response.status, response.ok)

      const data = await response.json()
      console.log('📄 Dados da resposta:', data)

      if (response.ok) {
        // Verificar se é um cartão rejeitado (success: false)
        if (data.success === false && data.status === 'rejected') {
          console.log('❌ Cartão rejeitado:', data.statusDetail)

          // Mostrar mensagem específica baseada no tipo de rejeição
          let errorMessage = 'Cartão rejeitado. '
          if (data.statusDetail === 'cc_rejected_insufficient_amount') {
            errorMessage += 'Saldo insuficiente.'
          } else if (data.statusDetail === 'cc_rejected_other_reason') {
            errorMessage += 'Verifique os dados do cartão e tente novamente.'
          } else {
            errorMessage += 'Tente com outro cartão.'
          }

          setError(errorMessage)
          setIsLoading(false)
        } else {
          console.log('✅ Pagamento processado com sucesso:', data.status)

          // Para PIX, mostrar QR Code e aguardar pagamento
          if (paymentMethod === 'pix' && data.qrCode) {
            setPixData({
              qrCode: data.qrCode,
              qrCodeText: data.qrCodeText,
              paymentId: data.paymentId,
              temporaryData: data.temporaryData
            })
            setShowPixPayment(true)
            setIsLoading(false)
          }
          // Para cartões, redirecionar baseado no status
          else if (data.status === 'approved') {
            window.location.href = `/success?userId=${data.userId}`
          } else if (data.status === 'rejected') {
            window.location.href = `/failure?userId=${data.userId}`
          } else {
            window.location.href = `/pending?userId=${data.userId}`
          }
        }
      } else {
        console.log('❌ Erro na resposta:', data.error)
        setError(data.error || 'Erro ao processar pagamento')
        setIsLoading(false)
      }
    } catch (error: unknown) {
      console.log('💥 Erro capturado:', error)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('⏰ Timeout da requisição - operação cancelada')
          setError('Operação cancelada ou timeout. Tente novamente.')
        } else if (error.message?.includes('fetch')) {
          console.log('🌐 Erro de rede/conexão')
          setError('Erro de conexão. Verifique sua internet e tente novamente.')
        } else {
          console.log('❌ Erro desconhecido:', error.message)
          setError('Erro ao processar pagamento. Tente novamente.')
        }
      } else {
        console.log('❌ Erro desconhecido:', error)
        setError('Erro ao processar pagamento. Tente novamente.')
      }

      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value

    // Aplicar máscara para número do cartão
    if (e.target.name === 'cardNumber') {
      value = value.replace(/\D/g, '') // Remove tudo que não é dígito
      value = value.replace(/(.{4})/g, '$1 ') // Adiciona espaço a cada 4 dígitos
      value = value.trim() // Remove espaço final
      value = value.substring(0, 19) // Limita a 19 caracteres (16 dígitos + 3 espaços)
    }

    // Aplicar máscara para CVV (só números)
    if (e.target.name === 'securityCode') {
      value = value.replace(/\D/g, '') // Remove tudo que não é dígito
    }

    setCardData({
      ...cardData,
      [e.target.name]: value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900">
        {/* Decorative Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-800/40 via-green-900/60 to-emerald-950"></div>
          <div className="absolute top-0 left-0 w-full h-full opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-yellow-300/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
          </div>

          {/* Floating Elements */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute top-20 left-10 text-5xl animate-float">✨</div>
            <div className="absolute top-40 right-20 text-4xl animate-float" style={{animationDelay: '0.3s'}}>🕊️</div>
            <div className="absolute bottom-32 left-16 text-6xl animate-float" style={{animationDelay: '0.7s'}}>🌿</div>
            <div className="absolute bottom-40 right-10 text-5xl animate-float" style={{animationDelay: '0.5s'}}>💫</div>
            <div className="absolute top-60 left-1/3 text-4xl animate-float" style={{animationDelay: '0.9s'}}>🙏</div>
            <div className="absolute top-80 right-1/3 text-3xl animate-float" style={{animationDelay: '1.1s'}}>✝️</div>
          </div>
        </div>

        <div className="container mx-auto px-6 text-center relative z-10 max-w-6xl py-12">
          {/* Badge */}
          <div className="inline-flex items-center bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 backdrop-blur-md border border-yellow-400/40 rounded-full px-8 py-3 mb-10 mt-8 md:mt-0 shadow-lg hover:shadow-yellow-400/30 transition-all duration-300">
            <span className="text-yellow-200 font-semibold tracking-wider text-sm uppercase">✨ Congresso de Mulheres ✨</span>
          </div>

          {/* Main Title */}
          <h1 className="text-7xl md:text-8xl lg:text-[10rem] font-black mb-8 leading-none">
            <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-400 bg-clip-text text-transparent font-serif tracking-tighter drop-shadow-2xl">
              ESSÊNCIA
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-3xl md:text-4xl font-semibold text-white mb-6 tracking-wide drop-shadow-lg">
            Prepare-se para um encontro com Deus
          </p>

          {/* Description */}
          <p className="text-xl md:text-2xl text-emerald-100 mb-16 leading-relaxed max-w-4xl mx-auto font-light">
            Um dia de adoração, louvor e renovação espiritual.<br/>
            Venha experimentar a presença de Deus e receber uma palavra transformadora para sua vida.
          </p>

          {/* Event Details */}
          <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
            <div className="bg-white/15 backdrop-blur-lg border border-white/30 rounded-3xl p-8 hover:bg-white/20 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <p className="text-yellow-200 font-bold mb-2 text-lg">Data</p>
                <p className="text-white text-2xl font-bold">15 de Novembro</p>
                <p className="text-emerald-200 text-base mt-1">2025</p>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-lg border border-white/30 rounded-3xl p-8 hover:bg-white/20 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <p className="text-yellow-200 font-bold mb-2 text-lg">Horário</p>
                <p className="text-white text-2xl font-bold">08h às 18h</p>
                <p className="text-emerald-200 text-base mt-1">Dia completo</p>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-lg border border-white/30 rounded-3xl p-8 hover:bg-white/20 hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <p className="text-yellow-200 font-bold mb-2 text-lg">Local</p>
                <p className="text-white text-2xl font-bold">Igreja Metodista</p>
                <p className="text-emerald-200 text-base mt-1">Pantanal</p>
              </div>
            </div>
          </div>

          {/* Price and Benefits Card */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl border-2 border-yellow-400/50 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <p className="text-emerald-100 text-lg mb-3 font-medium">Investimento</p>
                <p className="text-6xl md:text-7xl font-black text-transparent bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 bg-clip-text mb-2">
                  R$ 50,00
                </p>
                <p className="text-emerald-200 text-sm">Por pessoa</p>
              </div>

              {/* Benefits */}
              <div className="border-t border-white/20 pt-6 space-y-4">
                <p className="text-yellow-200 font-bold text-xl mb-4">✨ Incluso no valor ✨</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">☕</div>
                      <div className="text-left">
                        <p className="text-white font-bold text-lg">Café da Manhã</p>
                        <p className="text-emerald-200 text-sm">Completo</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">🍽️</div>
                      <div className="text-left">
                        <p className="text-white font-bold text-lg">Almoço</p>
                        <p className="text-emerald-200 text-sm">Completo</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                setShowForm(true)
                setError('')
                setIsLoading(false)
              }}
              className="group relative inline-flex items-center justify-center px-14 py-6 text-2xl font-black text-emerald-900 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 rounded-full hover:shadow-[0_30px_80px_-15px_rgba(250,204,21,0.7)] transition-all duration-500 hover:scale-110 border-4 border-yellow-200 overflow-hidden animate-pulse-glow"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center gap-4">
                <span className="text-3xl">🙏</span>
                Garantir Minha Vaga
                <span className="text-3xl">✨</span>
              </span>
            </button>

            <p className="text-emerald-200/80 text-sm mt-8 max-w-md">
              🔒 Pagamento 100% seguro via Mercado Pago
            </p>
          </div>
        </div>
      </section>

      {/* Modal de Pagamento Mercado Pago */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-[#00B1EA] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-lg p-2.5">
                  <img
                    src="/logo-mercado-pago.png"
                    alt="Mercado Pago"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Mercado Pago</h3>
                  <p className="text-base text-blue-100 font-medium">Pagamento seguro</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForm(false)
                  setError('')
                  setIsLoading(false)
                }}
                className="text-white hover:text-blue-200 transition-colors p-2"
              >
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Content with Scroll */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-6">
                {/* Purchase Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-800">Resumo da compra</h4>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                      R$ {valorTotal},00
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Congresso de Mulheres - Essência</span>
                      <span className="font-semibold text-gray-800">R$ {TAXA_INSCRICAO},00</span>
                    </div>
                    {acompanhantes.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Acompanhantes ({acompanhantes.length})</span>
                        <span className="font-semibold text-gray-800">R$ {acompanhantes.length * TAXA_INSCRICAO},00</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Inclui: Café da manhã + Almoço</span>
                      <span className="text-green-700 font-semibold">Grátis</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-base">
                      <span className="text-gray-800">Total ({1 + acompanhantes.length} pessoa{acompanhantes.length !== 0 ? 's' : ''})</span>
                      <span className="text-[#00B1EA]">R$ {valorTotal},00</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Dados pessoais</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome completo
                      </label>
                      <input
                        type="text"
                        name="nome"
                        required
                        value={formData.nome}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all placeholder:text-gray-600 text-gray-800"
                        placeholder="Digite seu nome completo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-mail
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all placeholder:text-gray-600 text-gray-800"
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CPF
                        </label>
                        <input
                          type="text"
                          name="cpf"
                          required
                          value={formData.cpf}
                          onChange={handleChange}
                          placeholder="000.000.000-00"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all placeholder:text-gray-600 text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          name="telefone"
                          required
                          value={formData.telefone}
                          onChange={handleChange}
                          placeholder="(11) 99999-9999"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all placeholder:text-gray-600 text-gray-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acompanhantes */}
                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-800">Acompanhantes</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setAcompanhantes([...acompanhantes, { nome: '' }])
                        }}
                        className="bg-[#00B1EA] hover:bg-[#0099CC] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {acompanhantes.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <p className="text-sm">Nenhum acompanhante adicionado</p>
                        <p className="text-xs mt-1">Clique em &quot;Adicionar&quot; para incluir acompanhantes</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {acompanhantes.map((acompanhante, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-800">Acompanhante {index + 1}</h5>
                              <button
                                type="button"
                                onClick={() => {
                                  setAcompanhantes(acompanhantes.filter((_, i) => i !== index))
                                }}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                ✕ Remover
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Nome completo
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={acompanhante.nome}
                                  onChange={(e) => {
                                    const newAcompanhantes = [...acompanhantes]
                                    newAcompanhantes[index].nome = e.target.value
                                    setAcompanhantes(newAcompanhantes)
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all placeholder:text-gray-600 text-gray-800"
                                  placeholder="Nome do acompanhante"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resumo dos valores */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <h5 className="font-semibold text-gray-800 mb-2">Resumo do valor</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-800">Titular: {formData.nome || 'Nome'}</span>
                          <span className="font-semibold text-gray-800">R$ {TAXA_INSCRICAO},00</span>
                        </div>
                        {acompanhantes.map((acompanhante, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-gray-800">
                              Acompanhante {index + 1}: {acompanhante.nome || `Acompanhante ${index + 1}`}
                            </span>
                            <span className="font-semibold text-gray-800">R$ {TAXA_INSCRICAO},00</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between font-bold text-lg">
                          <span className="text-gray-800">Total ({1 + acompanhantes.length} pessoa{acompanhantes.length !== 0 ? 's' : ''})</span>
                          <span className="text-[#00B1EA]">R$ {valorTotal},00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Como você quer pagar?</h4>

                    <div className="space-y-3 mb-6">
                      <div
                        onClick={() => setPaymentMethod('pix')}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          paymentMethod === 'pix'
                            ? 'border-[#00B1EA] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#32BCAD] rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">PIX</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">PIX</div>
                              <div className="text-sm text-gray-600">Aprovação imediata</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            paymentMethod === 'pix'
                              ? 'border-[#00B1EA] bg-[#00B1EA]'
                              : 'border-gray-300'
                          }`}>
                            {paymentMethod === 'pix' && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setPaymentMethod('credit')}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          paymentMethod === 'credit'
                            ? 'border-[#00B1EA] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                              <svg width="20" height="16" fill="white" viewBox="0 0 24 24">
                                <path d="M2 4h20v2H2V4zm0 4v10h20V8H2zm4 2h12v2H6v-2zm0 3h8v1H6v-1z"/>
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">Cartão de crédito</div>
                              <div className="text-sm text-gray-600">Visa, Mastercard, Elo</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            paymentMethod === 'credit'
                              ? 'border-[#00B1EA] bg-[#00B1EA]'
                              : 'border-gray-300'
                          }`}>
                            {paymentMethod === 'credit' && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setPaymentMethod('debit')}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          paymentMethod === 'debit'
                            ? 'border-[#00B1EA] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                              <svg width="20" height="16" fill="white" viewBox="0 0 24 24">
                                <path d="M2 4h20v2H2V4zm0 4v10h20V8H2zm4 2h12v2H6v-2zm0 3h8v1H6v-1z"/>
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">Cartão de débito</div>
                              <div className="text-sm text-gray-600">Débito à vista</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            paymentMethod === 'debit'
                              ? 'border-[#00B1EA] bg-[#00B1EA]'
                              : 'border-gray-300'
                          }`}>
                            {paymentMethod === 'debit' && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-800">Dados do cartão</h5>

                      

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número do cartão
                        </label>
                        <input
                          type="text"
                          name="cardNumber"
                          required
                          value={cardData.cardNumber}
                          onChange={handleCardChange}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all placeholder:text-gray-600 text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nome do titular
                        </label>
                        <input
                          type="text"
                          name="cardholderName"
                          required
                          value={cardData.cardholderName}
                          onChange={handleCardChange}
                          placeholder="Nome como está no cartão"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all placeholder:text-gray-600 text-gray-800"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mês
                          </label>
                          <select
                            name="expirationMonth"
                            required
                            value={cardData.expirationMonth}
                            onChange={handleCardChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all text-gray-700"
                          >
                            <option value="" className="text-gray-600">MM</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month.toString().padStart(2, '0')}>
                                {month.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ano
                          </label>
                          <select
                            name="expirationYear"
                            required
                            value={cardData.expirationYear}
                            onChange={handleCardChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all text-gray-700"
                          >
                            <option value="" className="text-gray-600">AA</option>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                              <option key={year} value={year.toString().slice(-2)}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            name="securityCode"
                            required
                            value={cardData.securityCode}
                            onChange={handleCardChange}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B1EA] focus:border-transparent transition-all placeholder:text-gray-600 text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PIX Information */}
                  {paymentMethod === 'pix' && (
                    <div className="bg-[#32BCAD]/10 border border-[#32BCAD]/20 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-[#32BCAD] rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-xs">PIX</span>
                        </div>
                        <h5 className="font-semibold text-gray-800">Pagamento PIX</h5>
                      </div>
                      <div className="text-sm text-gray-600 space-y-2">
                        <p>• Após finalizar, você receberá um QR Code para pagamento</p>
                        <p>• O pagamento é processado instantaneamente</p>
                        <p>• Sem taxas adicionais</p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                      <div className="flex items-center">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="mr-2">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-10v6h2V7h-2z"/>
                        </svg>
                        {error}
                      </div>
                    </div>
                  )}

                  {/* Security Badge */}
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 py-2">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                    </svg>
                    <span>Seus dados estão protegidos com criptografia SSL</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#00B1EA] hover:bg-[#0099CC] disabled:bg-gray-400 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processando...</span>
                      </div>
                    ) : (
                      paymentMethod === 'pix' ? 'Pagar com PIX' :
                      paymentMethod === 'credit' ? 'Pagar com cartão de crédito' :
                      'Pagar com cartão de débito'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code PIX */}
      {showPixPayment && pixData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-[#32BCAD] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#32BCAD] font-bold text-sm">PIX</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Pagamento PIX</h3>
                  <p className="text-sm text-green-100">Escaneie o QR Code</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPixPayment(false)
                  setPixData(null)
                  setShowForm(false)
                }}
                className="text-white hover:text-green-200 transition-colors p-2"
              >
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Content - com scroll */}
            <div className="flex-1 overflow-y-auto p-6 text-center">
              {/* Informações do Destinatário */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <svg width="20" height="20" fill="#1d4ed8" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <span className="text-blue-700 font-semibold">Destinatário</span>
                </div>
                <div className="text-sm text-blue-600">
                  <p className="font-medium">Vanderson Avellar da Silva</p>
                  <p>Banco Mercado Pago</p>
                  <p className="text-xs mt-1">PIX: R$ {(pixData?.temporaryData?.valorTotal as number) || 50},00</p>
                </div>
              </div>

              {/* Opções PIX */}
              <div className="space-y-6 mb-6">
                {/* QR Code */}
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">💻 Pelo computador</h4>
                  <div className="bg-white border-4 border-gray-200 rounded-2xl p-6 inline-block">
                    <div className="w-48 h-48 mx-auto flex items-center justify-center bg-white rounded-lg">
                      {pixData.qrCode ? (
                        <img
                          src={`data:image/png;base64,${pixData.qrCode}`}
                          alt="QR Code PIX"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-gray-600">
                          <div className="text-6xl mb-4">📱</div>
                          <p className="text-sm font-medium">QR Code PIX</p>
                          <p className="text-xs mt-1">Escaneie com seu celular</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Separador */}
                <div className="flex items-center justify-center">
                  <div className="border-t border-gray-300 flex-grow"></div>
                  <span className="px-4 text-gray-500 font-medium">OU</span>
                  <div className="border-t border-gray-300 flex-grow"></div>
                </div>

                {/* Chave PIX */}
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">📱 Pelo celular</h4>
                  <div className="bg-[#32BCAD]/10 border-2 border-[#32BCAD]/30 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-3">Copie a chave PIX abaixo:</p>
                    <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3">
                      <code className="text-sm font-mono text-gray-800 break-all">
                        {pixData.qrCodeText || 'Carregando chave PIX...'}
                      </code>
                    </div>
                    <button
                      onClick={() => {
                        if (pixData.qrCodeText) {
                          navigator.clipboard.writeText(pixData.qrCodeText)
                          alert('Chave PIX copiada! Cole no seu app do banco.')
                        }
                      }}
                      className="bg-[#32BCAD] hover:bg-[#2a9d8f] text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      📋 Copiar Chave PIX
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-4 mb-6">
                <h4 className="text-xl font-semibold text-gray-800">Passo a passo</h4>
                <div className="text-left space-y-3 text-gray-600">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#32BCAD] text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                    <p>Abra o app do seu banco ou instituição financeira</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#32BCAD] text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                    <p>Escolha a opção <strong>Pagar com PIX</strong></p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#32BCAD] text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                    <p><strong>Computador:</strong> Escaneie o QR Code<br/>
                       <strong>Celular:</strong> Cole a chave PIX copiada</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#32BCAD] text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</div>
                    <p>Confirme o pagamento de <strong>R$ {(pixData?.temporaryData?.valorTotal as number) || valorTotal},00</strong></p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <svg width="20" height="20" fill="#059669" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-green-700 font-semibold">Pagamento seguro</span>
                </div>
                <p className="text-sm text-green-600">
                  Após o pagamento, você será redirecionado para a página de confirmação.
                </p>
              </div>

              {/* Status e Simulação */}
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Aguardando pagamento...</span>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Assim que o pagamento for confirmado, você será redirecionado para a página de sucesso.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 Congresso Essência. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
