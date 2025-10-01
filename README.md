# Congresso de Inovação - Sistema de Inscrições

Sistema completo para cadastro e pagamento de inscrições em congressos, desenvolvido com Next.js, Prisma, Supabase e integração com Mercado Pago.

## 🚀 Funcionalidades

- **Landing Page**: Página promocional do congresso com informações do evento
- **Sistema de Inscrição**: Formulário de cadastro com dados pessoais
- **Pagamento Integrado**: Integração completa com Mercado Pago (R$ 50,00)
- **Consulta por CPF**: Sistema para consultar status da inscrição
- **Painel Administrativo**: Dashboard com estatísticas e exportação de dados
- **Páginas de Retorno**: Success, Failure e Pending para diferentes status de pagamento

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Lucide React
- **Backend**: Next.js API Routes, Prisma ORM
- **Banco de Dados**: PostgreSQL (Supabase)
- **Pagamentos**: Mercado Pago SDK
- **Deployment**: Vercel (recomendado)

## ⚙️ Configuração

### 1. Pré-requisitos

- Node.js 18+
- PostgreSQL database (Supabase)
- Conta no Mercado Pago

### 2. Instalação

```bash
# Instale as dependências
npm install

# Configure o banco de dados
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Variáveis de Ambiente

Configure o arquivo `.env.local`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/congresso_db"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN="your_mercado_pago_access_token"
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY="your_mercado_pago_public_key"

# App Config
NEXT_PUBLIC_APP_NAME="Cadastro Congresso"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
TAXA_INSCRICAO=50
```

### 4. Executar o Projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🔗 Rotas

- `/` - Landing page do congresso
- `/consulta` - Consulta de inscrição por CPF
- `/admin` - Painel administrativo
- `/success` - Página de pagamento aprovado
- `/failure` - Página de pagamento rejeitado
- `/pending` - Página de pagamento pendente

## 📊 Schema do Banco

```prisma
model User {
  id        String   @id @default(cuid())
  nome      String
  email     String   @unique
  cpf       String   @unique
  telefone  String
  createdAt DateTime @default(now())
  
  pagamentos Pagamento[]
}

model Pagamento {
  id               String           @id @default(cuid())
  userId           String
  valor            Float
  status           StatusPagamento  @default(PENDENTE)
  mercadoPagoId    String?
  createdAt        DateTime         @default(now())
  
  user User @relation(fields: [userId], references: [id])
}

enum StatusPagamento {
  PENDENTE
  APROVADO
  REJEITADO
  CANCELADO
}
```

## 🎯 Como Usar

1. **Configurar Credenciais**: Configure Supabase e Mercado Pago no `.env.local`
2. **Executar Migrações**: `npx prisma migrate dev`
3. **Iniciar Projeto**: `npm run dev`
4. **Testar Fluxo**: Acesse a landing page e teste o cadastro
5. **Admin**: Acesse `/admin` para ver estatísticas

## 📱 Recursos

- Interface responsiva (mobile-first)
- Validação de formulários
- Integração completa com Mercado Pago
- Dashboard administrativo
- Exportação de dados CSV
- Sistema de consulta por CPF
