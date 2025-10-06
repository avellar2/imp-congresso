import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { prisma } from '@/lib/prisma'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

async function recoverPayments() {
  try {
    console.log('🔍 Iniciando recuperação de pagamentos...')

    const payment = new Payment(client)

    // Buscar pagamentos aprovados recentes (últimos 30 dias)
    const payments = await payment.search({
      options: {
        criteria: 'desc',
        range: 'date_created',
        begin_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
      }
    })

    console.log(`📊 Encontrados ${payments.results?.length || 0} pagamentos no Mercado Pago`)

    const recovered = []
    const alreadyExists = []
    const failed = []

    for (const paymentData of payments.results || []) {
      try {
        // Verificar se é PIX e está aprovado
        if (paymentData.payment_method_id !== 'pix' || paymentData.status !== 'approved') {
          continue
        }

        console.log(`\n💳 Processando pagamento ${paymentData.id}`)

        // Verificar se já existe no banco
        const existingPayment = await prisma.pagamento.findUnique({
          where: { mercadoPagoId: paymentData.id?.toString() }
        })

        if (existingPayment) {
          console.log(`⚠️ Pagamento ${paymentData.id} já existe no banco`)
          alreadyExists.push({
            mercadoPagoId: paymentData.id,
            email: paymentData.payer?.email,
            valor: paymentData.transaction_amount
          })
          continue
        }

        // Extrair dados do pagador
        const email = paymentData.payer?.email
        const cpf = paymentData.payer?.identification?.number
        const nome = `${paymentData.payer?.first_name || ''} ${paymentData.payer?.last_name || ''}`.trim()

        if (!email || !cpf || !nome) {
          console.log(`❌ Dados incompletos para pagamento ${paymentData.id}`)
          failed.push({
            mercadoPagoId: paymentData.id,
            reason: 'Dados incompletos',
            data: { email, cpf, nome }
          })
          continue
        }

        console.log(`👤 Dados: ${nome} - ${email} - ${cpf}`)

        // Verificar se usuário já existe
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { cpf }
            ]
          }
        })

        if (!user) {
          // Criar usuário
          console.log(`✨ Criando novo usuário`)
          user = await prisma.user.create({
            data: {
              nome,
              email,
              cpf,
              telefone: '' // Não temos o telefone no pagamento do MP
            }
          })
        } else {
          console.log(`✅ Usuário já existe: ${user.id}`)
        }

        // Criar registro de pagamento
        await prisma.pagamento.create({
          data: {
            userId: user.id,
            valor: paymentData.transaction_amount || 0,
            status: 'APROVADO',
            mercadoPagoId: paymentData.id?.toString(),
            mercadoPagoStatus: 'approved',
            acompanhantes: [] // Não temos informação dos acompanhantes
          }
        })

        console.log(`✅ Pagamento ${paymentData.id} recuperado com sucesso!`)
        recovered.push({
          mercadoPagoId: paymentData.id,
          userId: user.id,
          nome,
          email,
          valor: paymentData.transaction_amount
        })

      } catch (error) {
        console.error(`❌ Erro ao processar pagamento ${paymentData.id}:`, error)
        failed.push({
          mercadoPagoId: paymentData.id,
          reason: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    console.log('\n📈 Resumo da recuperação:')
    console.log(`✅ Recuperados: ${recovered.length}`)
    console.log(`⚠️ Já existiam: ${alreadyExists.length}`)
    console.log(`❌ Falharam: ${failed.length}`)

    return NextResponse.json({
      success: true,
      summary: {
        total: payments.results?.length || 0,
        recovered: recovered.length,
        alreadyExists: alreadyExists.length,
        failed: failed.length
      },
      recovered,
      alreadyExists,
      failed
    })

  } catch (error: unknown) {
    console.error('❌ Erro ao recuperar pagamentos:', error)
    return NextResponse.json(
      {
        error: 'Erro ao recuperar pagamentos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return recoverPayments()
}

export async function POST(request: NextRequest) {
  return recoverPayments()
}
