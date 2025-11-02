import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se a inscrição existe
    const user = await prisma.user.findUnique({
      where: { id },
      include: { pagamentos: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Inscrição não encontrada' },
        { status: 404 }
      )
    }

    // Deletar os pagamentos primeiro (devido à relação)
    await prisma.pagamento.deleteMany({
      where: { userId: id }
    })

    // Deletar o usuário
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Inscrição deletada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar inscrição:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar inscrição' },
      { status: 500 }
    )
  }
}
