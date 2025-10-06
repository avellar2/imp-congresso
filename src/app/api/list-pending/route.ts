import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const pending = await prisma.pagamento.findMany({
      where: { status: 'PENDENTE' },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      count: pending.length,
      payments: pending.map(p => ({
        mercadoPagoId: p.mercadoPagoId,
        userId: p.userId,
        userName: p.user.nome,
        email: p.user.email,
        valor: p.valor,
        status: p.status,
        createdAt: p.createdAt
      }))
    })

  } catch (error: unknown) {
    console.error('❌ Erro ao listar pendentes:', error)
    return NextResponse.json(
      {
        error: 'Erro ao listar pagamentos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
