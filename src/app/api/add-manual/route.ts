import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const pessoas = [
      { nome: 'Neusa Gomes - IMP', email: 'neusagomes@imp.com', cpf: '00000000010' },
      { nome: 'Railda - IMP', email: 'railda@imp.com', cpf: '00000000011' },
      { nome: 'Nadir - IMP', email: 'nadir@imp.com', cpf: '00000000012' },
      { nome: 'Suellen - IMP', email: 'suellen@imp.com', cpf: '00000000013' },
      { nome: 'Bianca Lourenço - IMP', email: 'biancalourenco@imp.com', cpf: '00000000014' },
      { nome: 'Aparecida - IMP', email: 'aparecida@imp.com', cpf: '00000000015' },
      { nome: 'Enir - IMP', email: 'enir@imp.com', cpf: '00000000016' },
      { nome: 'Deusimar - IMP', email: 'deusimar@imp.com', cpf: '00000000017' },
      { nome: 'Isabella - IMP', email: 'isabella@imp.com', cpf: '00000000018' }
    ]

    const criados = []

    for (const pessoa of pessoas) {
      // Criar usuário
      const user = await prisma.user.create({
        data: {
          nome: pessoa.nome,
          email: pessoa.email,
          cpf: pessoa.cpf,
          telefone: ''
        }
      })

      // Criar pagamento PENDENTE (pagamento em dinheiro)
      const pagamento = await prisma.pagamento.create({
        data: {
          userId: user.id,
          valor: 50,
          status: 'PENDENTE',
          mercadoPagoId: null,
          mercadoPagoStatus: 'manual',
          acompanhantes: []
        }
      })

      criados.push({
        nome: pessoa.nome,
        userId: user.id,
        pagamentoId: pagamento.id
      })

      console.log(`✅ Criado: ${pessoa.nome}`)
    }

    return NextResponse.json({
      success: true,
      message: `${criados.length} inscrições manuais criadas com sucesso`,
      criados
    })

  } catch (error: unknown) {
    console.error('❌ Erro ao criar inscrições manuais:', error)
    return NextResponse.json(
      {
        error: 'Erro ao criar inscrições',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
