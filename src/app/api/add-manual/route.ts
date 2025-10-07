import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const timestamp = Date.now()
    const pessoas = [
      { nome: 'Neusa Gomes - IMP', email: `neusagomes.${timestamp}@imp.local`, cpf: `${timestamp}10` },
      { nome: 'Railda - IMP', email: `railda.${timestamp}@imp.local`, cpf: `${timestamp}11` },
      { nome: 'Nadir - IMP', email: `nadir.${timestamp}@imp.local`, cpf: `${timestamp}12` },
      { nome: 'Suellen - IMP', email: `suellen.${timestamp}@imp.local`, cpf: `${timestamp}13` },
      { nome: 'Bianca Lourenço - IMP', email: `biancalourenco.${timestamp}@imp.local`, cpf: `${timestamp}14` },
      { nome: 'Aparecida - IMP', email: `aparecida.${timestamp}@imp.local`, cpf: `${timestamp}15` },
      { nome: 'Enir - IMP', email: `enir.${timestamp}@imp.local`, cpf: `${timestamp}16` },
      { nome: 'Deusimar - IMP', email: `deusimar.${timestamp}@imp.local`, cpf: `${timestamp}17` },
      { nome: 'Isabella - IMP', email: `isabella.${timestamp}@imp.local`, cpf: `${timestamp}18` }
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
          metodoPagamento: 'DINHEIRO',
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
