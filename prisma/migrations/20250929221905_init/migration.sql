-- CreateEnum
CREATE TYPE "public"."StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pagamentos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" "public"."StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "mercadoPagoId" TEXT,
    "mercadoPagoStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "public"."users"("cpf");

-- AddForeignKey
ALTER TABLE "public"."pagamentos" ADD CONSTRAINT "pagamentos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
