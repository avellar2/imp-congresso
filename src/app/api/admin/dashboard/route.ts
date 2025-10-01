import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      totalUsers,
      approvedPayments,
      pendingPayments,
      recentRegistrations,
      totalRevenue
    ] = await Promise.all([
      // Total de usuários
      prisma.user.count(),
      
      // Pagamentos aprovados
      prisma.pagamento.count({
        where: { status: 'APROVADO' }
      }),
      
      // Pagamentos pendentes
      prisma.pagamento.count({
        where: { status: 'PENDENTE' }
      }),
      
      // Inscrições recentes (últimas 10)
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          pagamentos: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }),
      
      // Receita total
      prisma.pagamento.aggregate({
        where: { status: 'APROVADO' },
        _sum: { valor: true }
      })
    ])

    return NextResponse.json({
      totalUsers,
      totalRevenue: totalRevenue._sum.valor || 0,
      approvedPayments,
      pendingPayments,
      recentRegistrations
    })

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}