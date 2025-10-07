import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { nome } = await request.json()

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar usuário pelo nome (parcial)
    const user = await prisma.user.findFirst({
      where: {
        nome: {
          contains: nome,
          mode: 'insensitive'
        }
      },
      include: {
        pagamentos: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Buscar pagamento pendente
    const pagamentoPendente = user.pagamentos.find(p => p.status === 'PENDENTE')

    if (!pagamentoPendente) {
      return NextResponse.json(
        { error: 'Nenhum pagamento pendente encontrado para este usuário' },
        { status: 404 }
      )
    }

    // Atualizar para APROVADO
    const updated = await prisma.pagamento.update({
      where: { id: pagamentoPendente.id },
      data: {
        status: 'APROVADO',
        mercadoPagoStatus: 'manual_approved'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Pagamento aprovado para ${user.nome}`,
      userId: user.id,
      pagamentoId: updated.id,
      oldStatus: 'PENDENTE',
      newStatus: 'APROVADO'
    })

  } catch (error: unknown) {
    console.error('❌ Erro ao aprovar pagamento:', error)
    return NextResponse.json(
      {
        error: 'Erro ao aprovar pagamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
