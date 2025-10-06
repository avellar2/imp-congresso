import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { prisma } from '@/lib/prisma'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('🔔 Webhook recebido:', body)

    if (body.type === 'payment') {
      const payment = new Payment(client)
      const paymentData = await payment.get({ id: body.data.id })

      console.log('📋 Dados do pagamento:', {
        id: paymentData.id,
        status: paymentData.status,
        external_reference: paymentData.external_reference
      })

      // Se tem external_reference, atualizar pagamento existente
      if (paymentData.external_reference) {
        console.log('🔄 Atualizando pagamento existente com external_reference')
        await prisma.pagamento.update({
          where: { id: paymentData.external_reference },
          data: {
            mercadoPagoStatus: paymentData.status,
            status: mapStatus(paymentData.status!)
          }
        })
      } else {
        // Pagamento PIX sem external_reference - verificar se já foi salvo
        console.log('🔍 Verificando se pagamento PIX já existe no banco')
        const existingPayment = await prisma.pagamento.findUnique({
          where: { mercadoPagoId: paymentData.id?.toString() }
        })

        if (existingPayment) {
          // Atualizar status
          console.log('🔄 Atualizando status do pagamento PIX existente')
          await prisma.pagamento.update({
            where: { id: existingPayment.id },
            data: {
              mercadoPagoStatus: paymentData.status,
              status: mapStatus(paymentData.status!)
            }
          })
        } else {
          console.log('ℹ️ Pagamento PIX ainda não foi salvo - será salvo via polling do frontend')
        }
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

function mapStatus(mercadoPagoStatus: string) {
  switch (mercadoPagoStatus) {
    case 'approved':
      return 'APROVADO'
    case 'rejected':
      return 'REJEITADO'
    case 'cancelled':
      return 'CANCELADO'
    default:
      return 'PENDENTE'
  }
}