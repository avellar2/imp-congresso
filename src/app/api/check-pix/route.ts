import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'ID do pagamento é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🔍 Verificando status do pagamento PIX:', paymentId)

    // Buscar status do pagamento no banco de dados
    const pagamento = await prisma.pagamento.findFirst({
      where: { mercadoPagoId: paymentId.toString() },
      include: { user: true }
    })

    if (!pagamento) {
      return NextResponse.json(
        { error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    console.log('📊 Status do pagamento no banco:', pagamento.status)

    // Retornar status atual
    return NextResponse.json({
      status: pagamento.mercadoPagoStatus,
      dbStatus: pagamento.status,
      userId: pagamento.userId,
      success: pagamento.status === 'APROVADO'
    })

  } catch (error: unknown) {
    console.error('❌ Erro ao verificar pagamento PIX:', error)

    return NextResponse.json(
      { error: 'Erro ao verificar pagamento', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
