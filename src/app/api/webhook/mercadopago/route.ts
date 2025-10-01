import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { prisma } from '@/lib/prisma'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Webhook recebido:', body)

    if (body.type === 'payment') {
      const payment = new Payment(client)
      const paymentData = await payment.get({ id: body.data.id })

      if (paymentData.external_reference) {
        await prisma.pagamento.update({
          where: { id: paymentData.external_reference },
          data: {
            mercadoPagoStatus: paymentData.status,
            status: mapStatus(paymentData.status!)
          }
        })
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Erro no webhook:', error)
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