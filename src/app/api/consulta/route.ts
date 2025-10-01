import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cpf = searchParams.get('cpf')

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { cpf },
      include: {
        pagamentos: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Erro ao consultar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}