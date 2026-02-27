/**
 * Seed: cria o usuário de teste luiz.teste@email.com / Luiz@123
 *
 * Uso:
 *   npm run seed:user          (a partir de backend/)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const EMAIL = 'luiz.teste@email.com';
  const PASSWORD = 'Luiz@123';
  const NAME = 'Luiz Teste';
  const SALT = 10;

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existing) {
    console.log(`Usuário já existe: ${EMAIL} (id: ${existing.id})`);
    return;
  }

  const hashed = await bcrypt.hash(PASSWORD, SALT);

  const user = await prisma.user.create({
    data: { name: NAME, email: EMAIL, password: hashed },
  });

  console.log(`Usuário criado com sucesso!`);
  console.log(`  id:    ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  senha: ${PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
