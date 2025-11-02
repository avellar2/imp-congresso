import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, email, cpf, telefone, valor, metodoPagamento, acompanhantes, status } = body

    // Validações básicas
    if (!nome || !email || !cpf || !telefone || valor === undefined || !metodoPagamento) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    // Verificar se já existe usuário com este email
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    })

    // Verificar se já existe usuário com este CPF
    const existingUserByCPF = await prisma.user.findUnique({
      where: { cpf }
    })

    let userId: string

    if (existingUserByEmail && existingUserByCPF) {
      // Se ambos existem e são o mesmo usuário, usa o ID existente
      if (existingUserByEmail.id === existingUserByCPF.id) {
        userId = existingUserByEmail.id
      } else {
        return NextResponse.json(
          { error: 'Email ou CPF já cadastrado para outro usuário' },
          { status: 400 }
        )
      }
    } else if (existingUserByEmail || existingUserByCPF) {
      return NextResponse.json(
        { error: existingUserByEmail ? 'Email já cadastrado' : 'CPF já cadastrado' },
        { status: 400 }
      )
    } else {
      // Criar novo usuário
      const newUser = await prisma.user.create({
        data: {
          nome,
          email,
          cpf,
          telefone,
        },
      })
      userId = newUser.id
    }

    // Criar pagamento com status definido pelo usuário
    const pagamento = await prisma.pagamento.create({
      data: {
        userId,
        valor,
        status: status || 'APROVADO',
        metodoPagamento,
        acompanhantes: acompanhantes || [],
        mercadoPagoId: null,
        mercadoPagoStatus: 'manual',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Inscrição adicionada com sucesso',
      pagamento,
    })
  } catch (error) {
    console.error('Erro ao criar inscrição manual:', error)
    return NextResponse.json(
      { error: 'Erro ao criar inscrição manual' },
      { status: 500 }
    )
  }
}
