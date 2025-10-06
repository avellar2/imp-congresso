import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { prisma } from '@/lib/prisma'

interface MercadoPagoResponse {
  id?: number
  status?: string
  status_detail?: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code_base64?: string
      qr_code?: string
    }
  }
}

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    console.log('📨 Dados recebidos:', requestData)

    const { nome, email, cpf, telefone, token, installments = 1, issuer_id, cardNumber, cardholderName, paymentMethod = 'credit', acompanhantes = [], valorTotal = 50 } = requestData

    console.log('🔍 Campos extraídos:', { nome, email, cpf, telefone, token, cardNumber, cardholderName, paymentMethod })

    if (!nome || !email || !cpf || !telefone) {
      console.log('❌ Campos obrigatórios faltando')
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (paymentMethod !== 'pix' && !token) {
      console.log('❌ Token do cartão faltando')
      return NextResponse.json(
        { error: 'Token do cartão é obrigatório para pagamentos com cartão' },
        { status: 400 }
      )
    }

    // Verificar se já existe cadastro apenas para cartão
    // Para PIX, essa verificação será feita apenas no webhook após confirmação
    if (paymentMethod !== 'pix') {
      console.log('🔍 Verificando usuário existente para:', { email, cpf })
      try {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { cpf }
            ]
          }
        })

        if (existingUser) {
          console.log('❌ Usuário já existe:', existingUser)
          return NextResponse.json(
            { error: 'Email ou CPF já cadastrado' },
            { status: 400 }
          )
        }

        console.log('✅ Usuário não existe, prosseguindo...')
      } catch (dbError) {
        console.error('❌ Erro ao verificar usuário no banco:', dbError)
        return NextResponse.json(
          { error: 'Erro ao verificar dados no banco', details: dbError instanceof Error ? dbError.message : 'Erro desconhecido' },
          { status: 500 }
        )
      }
    }

    // Processar pagamento real com Mercado Pago
    const payment = new Payment(client)
    let response: MercadoPagoResponse

    if (paymentMethod === 'pix') {
      // PIX: Criar pagamento PIX real
      console.log('💰 Criando pagamento PIX real')
      console.log('🔑 Access Token existe?', !!process.env.MERCADO_PAGO_ACCESS_TOKEN)
      console.log('🏷️ App Name:', process.env.NEXT_PUBLIC_APP_NAME)

      try {
        // Verificar se já existe cadastro (antes de criar o pagamento)
        console.log('🔍 Verificando usuário existente para PIX:', { email, cpf })
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { cpf }
            ]
          }
        })

        if (existingUser) {
          console.log('❌ Usuário já existe:', existingUser)
          return NextResponse.json(
            { error: 'Email ou CPF já cadastrado' },
            { status: 400 }
          )
        }

        const paymentData = {
          transaction_amount: valorTotal,
          description: `Inscrição ${process.env.NEXT_PUBLIC_APP_NAME} - ${nome}`,
          payment_method_id: 'pix',
          payer: {
            email: email,
            first_name: nome.split(' ')[0],
            last_name: nome.split(' ').slice(1).join(' ') || nome.split(' ')[0],
            identification: {
              type: 'CPF',
              number: cpf.replace(/\D/g, '')
            }
          }
        }

        console.log('📤 Enviando dados PIX para MP:', JSON.stringify(paymentData, null, 2))
        response = await payment.create({ body: paymentData }) as MercadoPagoResponse
        console.log('📥 Resposta PIX do MP:', JSON.stringify(response, null, 2))

        // SALVAR NO BANCO IMEDIATAMENTE COM STATUS PENDENTE
        console.log('💾 Salvando dados no banco com status PENDENTE...')

        // Criar usuário
        const user = await prisma.user.create({
          data: {
            nome,
            email,
            cpf,
            telefone
          }
        })

        // Extrair nomes dos acompanhantes
        const nomesAcompanhantes = acompanhantes
          .map((acomp: {nome: string}) => acomp.nome)
          .filter((nome: string) => nome && nome.trim() !== '')

        // Criar registro de pagamento PENDENTE
        await prisma.pagamento.create({
          data: {
            userId: user.id,
            valor: valorTotal,
            status: 'PENDENTE',
            mercadoPagoId: response.id?.toString(),
            mercadoPagoStatus: response.status || 'pending',
            acompanhantes: nomesAcompanhantes
          }
        })

        console.log('✅ Usuário e pagamento PENDENTE salvos no banco!')
        console.log(`👥 Acompanhantes salvos: ${nomesAcompanhantes.length}`)

        return NextResponse.json({
          success: true,
          paymentMethod: 'pix',
          paymentId: response.id?.toString(),
          userId: user.id,
          status: response.status,
          statusDetail: response.status_detail,
          qrCode: response.point_of_interaction?.transaction_data?.qr_code_base64,
          qrCodeText: response.point_of_interaction?.transaction_data?.qr_code,
          temporaryData: {
            nome,
            email,
            cpf,
            telefone,
            acompanhantes,
            valorTotal,
            mercadoPagoId: response.id?.toString()
          }
        })
      } catch (error: unknown) {
        console.error('❌ Erro ao criar pagamento PIX:', error)
        console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
        console.error('❌ Detalhes completos:', JSON.stringify(error, null, 2))

        return NextResponse.json(
          {
            error: 'Erro ao processar pagamento PIX',
            details: error instanceof Error ? error.message : 'Erro desconhecido',
            type: error instanceof Error ? error.constructor.name : typeof error
          },
          { status: 500 }
        )
      }
    } else if (paymentMethod === 'credit' || paymentMethod === 'debit') {
      // Cartão: Criar pagamento real
      if (!token) {
        return NextResponse.json(
          { error: 'Token do cartão é obrigatório' },
          { status: 400 }
        )
      }

      console.log(`💳 Criando pagamento real com cartão ${paymentMethod}`)

      try {
        const paymentData = {
          transaction_amount: valorTotal,
          token: token,
          description: `Inscrição ${process.env.NEXT_PUBLIC_APP_NAME} - ${nome}`,
          installments: installments || 1,
          payment_method_id: paymentMethod === 'credit' ? 'visa' : 'debvisa',
          issuer_id: issuer_id,
          payer: {
            email: email,
            first_name: nome.split(' ')[0],
            last_name: nome.split(' ').slice(1).join(' ') || nome.split(' ')[0],
            identification: {
              type: 'CPF',
              number: cpf.replace(/\D/g, '')
            }
          }
        }

        console.log('📤 Enviando dados cartão para MP:', paymentData)
        response = await payment.create({ body: paymentData }) as MercadoPagoResponse
        console.log('📥 Resposta cartão do MP:', response)

        // Só salvar no banco se o pagamento foi APROVADO
        if (response.status === 'approved') {
          console.log('💚 Pagamento aprovado! Salvando no banco...')

          // Criar usuário
          const user = await prisma.user.create({
            data: {
              nome,
              email,
              cpf,
              telefone
            }
          })

          // Criar registro de pagamento aprovado
          await prisma.pagamento.create({
            data: {
              userId: user.id,
              valor: valorTotal,
              status: 'APROVADO',
              mercadoPagoId: response.id?.toString()?.toString(),
              mercadoPagoStatus: response.status,
              acompanhantes: acompanhantes.map((acomp: {nome: string}) => acomp.nome).filter((nome: string) => nome.trim() !== '')
            }
          })

          return NextResponse.json({
            success: true,
            paymentId: response.id?.toString(),
            status: response.status,
            statusDetail: response.status_detail,
            userId: user.id
          })
        } else {
          console.log('❌ Pagamento rejeitado! NÃO salvando no banco.')

          return NextResponse.json({
            success: false,
            paymentId: response.id?.toString(),
            status: response.status,
            statusDetail: response.status_detail,
            error: `Pagamento rejeitado: ${response.status_detail}`
          }, { status: 200 })
        }
      } catch (error: unknown) {
        console.error('❌ Erro ao criar pagamento cartão:', error)
        return NextResponse.json(
          { error: 'Erro ao processar pagamento', details: error instanceof Error ? error.message : 'Erro desconhecido' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Método de pagamento não suportado' },
        { status: 400 }
      )
    }

  } catch (error: unknown) {
    console.error('Erro ao criar pagamento:', error)

    // Verificar se é erro de constraint única (email duplicado)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email ou CPF já cadastrado' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}