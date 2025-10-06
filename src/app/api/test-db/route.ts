import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Testar conexão simples
    const count = await prisma.user.count()

    return NextResponse.json({
      success: true,
      message: 'Conexão com banco OK',
      userCount: count,
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@') // Ocultar senha
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@') // Ocultar senha
    }, { status: 500 })
  }
}
