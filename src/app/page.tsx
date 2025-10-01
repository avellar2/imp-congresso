'use client'

import { useState } from 'react'
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

  const TAXA_INSCRICAO = 50
  const valorTotal = (1 + acompanhantes.length) * TAXA_INSCRICAO

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
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/95 to-green-800/95 backdrop-blur-sm"></div>
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-400/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
          </div>

          {/* Floating Elements */}
          <div className="absolute inset-0 overflow-hidden opacity-30">
            <div className="absolute top-20 left-10 text-4xl animate-bounce delay-100">🌸</div>
            <div className="absolute top-40 right-20 text-3xl animate-pulse delay-300">✨</div>
            <div className="absolute bottom-32 left-16 text-5xl animate-bounce delay-700">🌿</div>
            <div className="absolute bottom-40 right-10 text-4xl animate-pulse delay-500">🦋</div>
            <div className="absolute top-60 left-1/3 text-3xl animate-bounce delay-900">🍃</div>
            <div className="absolute top-80 right-1/3 text-2xl animate-pulse delay-1100">💫</div>
          </div>
        </div>

        <div className="container mx-auto px-6 text-center relative z-10 max-w-5xl">
          {/* Badge */}
          <div className="inline-flex items-center bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-full px-6 py-2 mb-8 mt-8 md:mt-0">
            <span className="text-yellow-300 font-medium tracking-wide text-sm uppercase">Congresso de Mulheres</span>
          </div>

          {/* Main Title */}
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold mb-6 leading-none">
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent font-serif tracking-tight">
              ESSÊNCIA
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-2xl md:text-3xl font-light text-emerald-100 mb-8 tracking-wide">
            Desperte sua força interior
          </p>

          {/* Description */}
          <p className="text-lg md:text-xl text-emerald-200 mb-12 leading-relaxed max-w-3xl mx-auto font-light">
            Um encontro transformador dedicado ao empoderamento feminino.
            Conecte-se com sua essência e descubra o poder que existe dentro de você.
          </p>

          {/* Event Details */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-yellow-300" />
                </div>
                <p className="text-yellow-300 font-semibold mb-1">Data</p>
                <p className="text-emerald-100 text-lg">15 de Novembro</p>
                <p className="text-emerald-200 text-sm">2025</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-yellow-300" />
                </div>
                <p className="text-yellow-300 font-semibold mb-1">Horário</p>
                <p className="text-emerald-100 text-lg">08h00 às 18h00</p>
                <p className="text-emerald-200 text-sm">Dia completo</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-yellow-300" />
                </div>
                <p className="text-yellow-300 font-semibold mb-1">Local</p>
                <p className="text-emerald-100 text-lg">Igreja Metodista</p>
                <p className="text-emerald-200 text-sm">Pantanal</p>
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
              className="group relative inline-flex items-center justify-center px-12 py-5 text-xl font-bold text-emerald-900 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-full shadow-2xl hover:shadow-yellow-500/50 transition-all duration-500 transform hover:scale-110 hover:rotate-1 border-2 border-yellow-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center gap-3">
                <span className="text-2xl">✨</span>
                Garantir Minha Vaga
                <span className="text-2xl">✨</span>
              </span>
            </button>

            <div className="mt-6 text-center">
              <p className="text-2xl font-bold text-yellow-300 mb-2">R$ 50,00</p>
              <p className="text-emerald-200 text-sm flex items-center justify-center gap-2">
                <span>🍃</span>
                Café da manhã e almoço inclusos
                <span>🍃</span>
              </p>
            </div>

            {/* Scroll indicator */}
            <div className="mt-16 animate-bounce">
              <div className="w-6 h-10 border-2 border-emerald-300/50 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-emerald-300/70 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre o Evento */}
      <section id="sobre" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-white to-green-50/50"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-20">
              <div className="inline-block bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent text-lg font-semibold mb-4 tracking-wide">
                DESCUBRA SUA FORÇA
              </div>
              <h3 className="text-5xl md:text-6xl font-bold mb-6 text-green-900 leading-tight">
                O que é o
                <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent"> Essência</span>
              </h3>
              <p className="text-xl text-green-700/80 leading-relaxed max-w-3xl mx-auto font-light">
                Um encontro único e transformador dedicado ao empoderamento da mulher.
                Durante um dia inteiro de inspiração, você participará de experiências que irão despertar sua verdadeira essência.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              <div className="group relative">
                <div className="bg-gradient-to-br from-white to-emerald-50/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-emerald-100/50">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">👑</span>
                  </div>
                  <h4 className="text-2xl font-bold mb-4 text-green-900">Palestrantes Inspiradoras</h4>
                  <p className="text-green-700/80 leading-relaxed">
                    Mulheres extraordinárias que transformaram suas vidas e agora compartilham suas jornadas para inspirar outras mulheres.
                  </p>
                </div>
              </div>

              <div className="group relative">
                <div className="bg-gradient-to-br from-white to-emerald-50/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-emerald-100/50">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">🌸</span>
                  </div>
                  <h4 className="text-2xl font-bold mb-4 text-green-900">Workshops Transformadores</h4>
                  <p className="text-green-700/80 leading-relaxed">
                    Atividades práticas e dinâmicas que irão despertar sua força interior e revelar todo seu potencial feminino.
                  </p>
                </div>
              </div>

              <div className="group relative">
                <div className="bg-gradient-to-br from-white to-emerald-50/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-emerald-100/50">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">✨</span>
                  </div>
                  <h4 className="text-2xl font-bold mb-4 text-green-900">Conexões Significativas</h4>
                  <p className="text-green-700/80 leading-relaxed">
                    Encontre sua tribo e crie laços femininos genuínos que irão fortalecer sua jornada de crescimento pessoal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programação */}
      <section id="programacao" className="py-24 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/30 via-transparent to-green-100/30"></div>
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-20">
              <div className="inline-block bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent text-lg font-semibold mb-4 tracking-wide">
                SUA JORNADA DE TRANSFORMAÇÃO
              </div>
              <h3 className="text-5xl md:text-6xl font-bold mb-6 text-green-900 leading-tight">
                Programação do
                <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent"> Dia</span>
              </h3>
              <p className="text-xl text-green-700/80 leading-relaxed max-w-3xl mx-auto font-light">
                Um cronograma cuidadosamente planejado para sua transformação pessoal e crescimento espiritual.
              </p>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-yellow-400 via-emerald-500 to-green-600 rounded-full hidden lg:block"></div>

              <div className="space-y-12">
                {/* Morning Sessions */}
                <div className="lg:flex lg:items-center lg:justify-between">
                  <div className="lg:w-5/12 lg:text-right lg:pr-12">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-emerald-200/50 hover:shadow-2xl transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4 lg:justify-end">
                        <span className="text-3xl">🌅</span>
                        <div className="text-right lg:text-left">
                          <h4 className="text-xl font-bold text-green-900">08h00 - 09h00</h4>
                          <p className="text-emerald-600 text-sm">Acolhimento</p>
                        </div>
                      </div>
                      <h5 className="text-2xl font-bold text-green-800 mb-3">Café da Manhã & Boas-vindas</h5>
                      <p className="text-green-700/80">Momento especial de conexão e acolhimento para iniciar nossa jornada juntas.</p>
                    </div>
                  </div>
                  <div className="hidden lg:block w-2/12 text-center">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full border-4 border-white shadow-lg mx-auto"></div>
                  </div>
                  <div className="lg:w-5/12"></div>
                </div>

                <div className="lg:flex lg:items-center lg:justify-between">
                  <div className="lg:w-5/12"></div>
                  <div className="hidden lg:block w-2/12 text-center">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg mx-auto"></div>
                  </div>
                  <div className="lg:w-5/12 lg:pl-12">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-emerald-200/50 hover:shadow-2xl transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">✨</span>
                        <div>
                          <h4 className="text-xl font-bold text-green-900">09h00 - 10h30</h4>
                          <p className="text-emerald-600 text-sm">Palestra</p>
                        </div>
                      </div>
                      <h5 className="text-2xl font-bold text-green-800 mb-3">Despertando Sua Essência</h5>
                      <p className="text-green-700/80">Descobrindo sua verdadeira identidade feminina e reconnectando com seu poder interior.</p>
                    </div>
                  </div>
                </div>

                <div className="lg:flex lg:items-center lg:justify-between">
                  <div className="lg:w-5/12 lg:text-right lg:pr-12">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-emerald-200/50 hover:shadow-2xl transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4 lg:justify-end">
                        <span className="text-3xl">🌸</span>
                        <div className="text-right lg:text-left">
                          <h4 className="text-xl font-bold text-green-900">10h45 - 12h00</h4>
                          <p className="text-emerald-600 text-sm">Workshop</p>
                        </div>
                      </div>
                      <h5 className="text-2xl font-bold text-green-800 mb-3">Autoestima & Confiança</h5>
                      <p className="text-green-700/80">Exercícios práticos e dinâmicas para fortalecer sua autoconfiança e autoestima.</p>
                    </div>
                  </div>
                  <div className="hidden lg:block w-2/12 text-center">
                    <div className="w-6 h-6 bg-green-600 rounded-full border-4 border-white shadow-lg mx-auto"></div>
                  </div>
                  <div className="lg:w-5/12"></div>
                </div>

                {/* Afternoon Sessions */}
                <div className="lg:flex lg:items-center lg:justify-between">
                  <div className="lg:w-5/12"></div>
                  <div className="hidden lg:block w-2/12 text-center">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full border-4 border-white shadow-lg mx-auto"></div>
                  </div>
                  <div className="lg:w-5/12 lg:pl-12">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-emerald-200/50 hover:shadow-2xl transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">🍽️</span>
                        <div>
                          <h4 className="text-xl font-bold text-green-900">12h00 - 13h30</h4>
                          <p className="text-emerald-600 text-sm">Pausa</p>
                        </div>
                      </div>
                      <h5 className="text-2xl font-bold text-green-800 mb-3">Almoço & Networking</h5>
                      <p className="text-green-700/80">Momento de confraternização, troca de experiências e criação de conexões significativas.</p>
                    </div>
                  </div>
                </div>

                <div className="lg:flex lg:items-center lg:justify-between">
                  <div className="lg:w-5/12 lg:text-right lg:pr-12">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-emerald-200/50 hover:shadow-2xl transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4 lg:justify-end">
                        <span className="text-3xl">💎</span>
                        <div className="text-right lg:text-left">
                          <h4 className="text-xl font-bold text-green-900">13h30 - 15h00</h4>
                          <p className="text-emerald-600 text-sm">Palestra</p>
                        </div>
                      </div>
                      <h5 className="text-2xl font-bold text-green-800 mb-3">Mulher de Propósito</h5>
                      <p className="text-green-700/80">Encontrando e vivendo seu propósito de vida com paixão e determinação.</p>
                    </div>
                  </div>
                  <div className="hidden lg:block w-2/12 text-center">
                    <div className="w-6 h-6 bg-emerald-400 rounded-full border-4 border-white shadow-lg mx-auto"></div>
                  </div>
                  <div className="lg:w-5/12"></div>
                </div>

                <div className="lg:flex lg:items-center lg:justify-between">
                  <div className="lg:w-5/12"></div>
                  <div className="hidden lg:block w-2/12 text-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full border-4 border-white shadow-xl mx-auto flex items-center justify-center">
                      <span className="text-white text-xs">🌟</span>
                    </div>
                  </div>
                  <div className="lg:w-5/12 lg:pl-12">
                    <div className="bg-gradient-to-br from-yellow-50 to-emerald-50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-yellow-200/50 hover:shadow-2xl transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">🌟</span>
                        <div>
                          <h4 className="text-xl font-bold text-green-900">15h15 - 18h00</h4>
                          <p className="text-yellow-600 text-sm font-semibold">Workshop Final</p>
                        </div>
                      </div>
                      <h5 className="text-2xl font-bold text-green-800 mb-3">Plano de Ação Transformador</h5>
                      <p className="text-green-700/80">Criando seu mapa pessoal para uma vida plena, realizada e alinhada com sua essência.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-emerald-800 to-green-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 text-4xl animate-pulse">🌺</div>
          <div className="absolute top-20 right-20 text-3xl animate-bounce">✨</div>
          <div className="absolute bottom-10 left-20 text-5xl animate-pulse">🦋</div>
          <div className="absolute bottom-20 right-10 text-4xl animate-bounce">🌿</div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h3 className="text-4xl font-bold mb-4">🌟 Transforme Sua Vida Hoje! 🌟</h3>
          <p className="text-xl mb-8 text-emerald-100">
            Vagas limitadas - Investimento especial de apenas <span className="text-yellow-400 font-bold">R$ 50,00</span>
          </p>
          <div className="mb-6">
            <p className="text-emerald-200 font-medium">🎁 Incluso: Café da manhã + Almoço</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true)
              setError('')
              setIsLoading(false)
            }}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-green-900 px-10 py-4 rounded-full text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-yellow-400"
          >
            ✨ Quero Despertar Minha Essência ✨
          </button>
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
