import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        pagamentos: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Criar CSV
    const csvHeader = 'Nome,Email,CPF,Telefone,Data Inscrição,Valor Pagamento,Status Pagamento\n'
    
    const csvRows = users.map(user => {
      const pagamento = user.pagamentos[0]
      return [
        user.nome,
        user.email,
        user.cpf,
        user.telefone,
        new Date(user.createdAt).toLocaleDateString('pt-BR'),
        pagamento ? `R$ ${pagamento.valor.toFixed(2)}` : 'R$ 0,00',
        pagamento?.status || 'PENDENTE'
      ].join(',')
    }).join('\n')

    const csvContent = csvHeader + csvRows

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inscricoes-congresso-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Erro ao exportar dados:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}