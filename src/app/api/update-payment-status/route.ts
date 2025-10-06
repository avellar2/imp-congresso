import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { prisma } from '@/lib/prisma'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

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

export async function POST(request: NextRequest) {
  try {
    const { mercadoPagoId } = await request.json()

    if (!mercadoPagoId) {
      return NextResponse.json(
        { error: 'ID do pagamento do Mercado Pago é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🔍 Buscando status do pagamento:', mercadoPagoId)

    // Buscar status no Mercado Pago
    const payment = new Payment(client)
    const paymentData = await payment.get({ id: mercadoPagoId })

    console.log('📊 Status no MP:', paymentData.status)

    // Buscar pagamento no banco
    const pagamento = await prisma.pagamento.findFirst({
      where: { mercadoPagoId: mercadoPagoId.toString() },
      include: { user: true }
    })

    if (!pagamento) {
      return NextResponse.json(
        { error: 'Pagamento não encontrado no banco' },
        { status: 404 }
      )
    }

    // Atualizar status
    const updated = await prisma.pagamento.update({
      where: { id: pagamento.id },
      data: {
        mercadoPagoStatus: paymentData.status,
        status: mapStatus(paymentData.status!)
      }
    })

    console.log('✅ Status atualizado:', updated.status)

    return NextResponse.json({
      success: true,
      message: 'Status atualizado com sucesso',
      oldStatus: pagamento.status,
      newStatus: updated.status,
      mercadoPagoStatus: paymentData.status,
      userId: pagamento.userId,
      userName: pagamento.user.nome
    })

  } catch (error: unknown) {
    console.error('❌ Erro ao atualizar status:', error)
    return NextResponse.json(
      {
        error: 'Erro ao atualizar status',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
