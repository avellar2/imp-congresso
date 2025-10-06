import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Simular webhook do Mercado Pago
    const webhookUrl = process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/mercadopago`
      : 'https://congresso-essencia.vercel.app/api/webhook/mercadopago'

    // Pegar um pagamento pendente para testar
    const pendingResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://congresso-essencia.vercel.app'}/api/list-pending`
    )
    const pendingData = await pendingResponse.json()

    if (pendingData.count === 0) {
      return NextResponse.json({
        success: false,
        message: 'Não há pagamentos pendentes para testar'
      })
    }

    const paymentId = pendingData.payments[0].mercadoPagoId

    // Simular webhook do MP
    const webhookBody = {
      action: 'payment.updated',
      api_version: 'v1',
      data: {
        id: paymentId
      },
      date_created: new Date().toISOString(),
      id: Math.floor(Math.random() * 1000000),
      live_mode: true,
      type: 'payment',
      user_id: '352598699'
    }

    console.log('🧪 Testando webhook com:', webhookBody)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookBody)
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Webhook testado',
      webhookUrl,
      paymentId,
      webhookResponse: result
    })

  } catch (error: unknown) {
    console.error('❌ Erro ao testar webhook:', error)
    return NextResponse.json(
      {
        error: 'Erro ao testar webhook',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
