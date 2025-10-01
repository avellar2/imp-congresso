import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { nome, email, cpf, telefone, acompanhantes = [], valorTotal = 50, mercadoPagoId } = await request.json()

    console.log('💚 Confirmando pagamento PIX para:', { nome, email, cpf, telefone, acompanhantes, valorTotal, mercadoPagoId })

    if (!mercadoPagoId) {
      return NextResponse.json(
        { error: 'ID do pagamento do Mercado Pago é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se já existe
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { cpf }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email ou CPF já cadastrado' },
        { status: 400 }
      )
    }

    // Criar usuário principal
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        cpf,
        telefone
      }
    })

    // Extrair nomes dos acompanhantes
    const nomesAcompanhantes = acompanhantes
      .map((acomp: {nome: string}) => acomp.nome)
      .filter((nome: string) => nome && nome.trim() !== '')

    // Criar registro de pagamento aprovado
    const pagamento = await prisma.pagamento.create({
      data: {
        userId: user.id,
        valor: valorTotal,
        status: 'APROVADO',
        mercadoPagoId: mercadoPagoId,
        mercadoPagoStatus: 'approved',
        acompanhantes: nomesAcompanhantes
      }
    })

    console.log('✅ Pagamento PIX confirmado e salvo no banco!')
    console.log(`👥 Acompanhantes salvos: ${nomesAcompanhantes.length}`)

    return NextResponse.json({
      success: true,
      userId: user.id,
      paymentId: pagamento.id,
      status: 'approved',
      acompanhantes: nomesAcompanhantes,
      totalPessoas: 1 + nomesAcompanhantes.length
    })

  } catch (error: unknown) {
    console.error('Erro ao confirmar pagamento PIX:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email ou CPF já cadastrado' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}