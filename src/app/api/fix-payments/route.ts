import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🧹 Limpando registros duplicados...')

    // Deletar todos os pagamentos e usuários existentes relacionados aos IDs do MP
    await prisma.pagamento.deleteMany({
      where: {
        mercadoPagoId: {
          in: ['128783542186', '128842924422']
        }
      }
    })

    // Deletar usuários antigos (se existirem)
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'mariadefatima120562@gmail.com' },
          { email: 'tat_juliao@yahoo.com.br' }
        ]
      }
    })

    console.log('✅ Registros antigos deletados')
    console.log('💾 Criando registros corretos...')

    // Criar Maria de Fátima
    const maria = await prisma.user.create({
      data: {
        nome: 'Maria de Fátima Borges da Silva',
        email: 'mariadefatima120562@gmail.com',
        cpf: '00000000000', // CPF não estava no pagamento MP
        telefone: ''
      }
    })

    await prisma.pagamento.create({
      data: {
        userId: maria.id,
        valor: 50,
        status: 'APROVADO',
        mercadoPagoId: '128842924422',
        mercadoPagoStatus: 'approved',
        acompanhantes: []
      }
    })

    console.log('✅ Maria de Fátima criada')

    // Criar Thaisis
    const thaisis = await prisma.user.create({
      data: {
        nome: 'Thaisis de Castro Julião',
        email: 'tat_juliao@yahoo.com.br',
        cpf: '00000000001', // CPF não estava no pagamento MP
        telefone: ''
      }
    })

    await prisma.pagamento.create({
      data: {
        userId: thaisis.id,
        valor: 50,
        status: 'APROVADO',
        mercadoPagoId: '128783542186',
        mercadoPagoStatus: 'approved',
        acompanhantes: []
      }
    })

    console.log('✅ Thaisis criada')

    return NextResponse.json({
      success: true,
      message: 'Pagamentos corrigidos com sucesso!',
      users: [
        {
          nome: 'Maria de Fátima Borges da Silva',
          email: 'mariadefatima120562@gmail.com',
          mercadoPagoId: '128842924422',
          userId: maria.id
        },
        {
          nome: 'Thaisis de Castro Julião',
          email: 'tat_juliao@yahoo.com.br',
          mercadoPagoId: '128783542186',
          userId: thaisis.id
        }
      ]
    })

  } catch (error) {
    console.error('❌ Erro ao corrigir pagamentos:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
