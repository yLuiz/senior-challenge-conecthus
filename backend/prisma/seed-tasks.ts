/**
 * Seed: gera 50 tarefas fictícias para luiz.teste@email.com
 *
 * Uso:
 *   npm run seed:tasks         (a partir de backend/)
 *
 * Pré-requisito: o usuário deve já existir (rode seed:user antes).
 */

import 'dotenv/config';
import { PrismaClient, TaskStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── dados fictícios ───────────────────────────────────────────────────────────

const TITLES = [
  'Revisar documentação do projeto',
  'Implementar autenticação JWT',
  'Corrigir bug no formulário de login',
  'Adicionar testes unitários ao serviço de tarefas',
  'Refatorar módulo de usuários',
  'Configurar pipeline de CI/CD',
  'Criar endpoint de exportação CSV',
  'Otimizar queries do banco de dados',
  'Atualizar dependências do projeto',
  'Revisar pull request do colega',
  'Documentar API com Swagger',
  'Implementar cache com Redis',
  'Adicionar paginação à listagem',
  'Configurar variáveis de ambiente',
  'Escrever testes de integração',
  'Criar migration de índices',
  'Implementar soft delete em tarefas',
  'Adicionar filtro de busca full-text',
  'Configurar CORS corretamente',
  'Revisar política de segurança',
  'Criar dashboard de métricas',
  'Integrar serviço de e-mail',
  'Implementar websockets para notificações',
  'Adicionar validação de CPF',
  'Criar relatório mensal',
  'Configurar backup automático do banco',
  'Migrar para TypeScript estrito',
  'Implementar rate limiting',
  'Revisar logs de auditoria',
  'Criar tela de perfil do usuário',
  'Adicionar suporte a dark mode',
  'Implementar internacionalização (i18n)',
  'Corrigir problema de memory leak',
  'Otimizar bundle do frontend',
  'Adicionar lazy loading nas imagens',
  'Implementar skeleton loading',
  'Revisar acessibilidade (a11y)',
  'Criar testes E2E com Playwright',
  'Configurar monitoramento com Sentry',
  'Adicionar compressão gzip no servidor',
  'Implementar upload de arquivos',
  'Criar webhook para integração externa',
  'Revisar estrutura de pastas do projeto',
  'Adicionar ESLint rules customizadas',
  'Implementar retry automático em falhas',
  'Criar seed de dados para staging',
  'Configurar alertas de performance',
  'Implementar autenticação 2FA',
  'Escrever guia de contribuição',
  'Realizar code review semanal',
];

const DESCRIPTIONS = [
  'Verificar se todos os endpoints estão devidamente documentados e testados.',
  'Garantir que os tokens expiram corretamente e o refresh funciona.',
  'O botão de submit não responde em mobile; investigar evento touch.',
  'Cobrir pelo menos 80% das linhas com testes automatizados.',
  'Separar responsabilidades e aplicar princípios SOLID.',
  'Automatizar build, lint e deploy para o ambiente de staging.',
  null,
  'Adicionar índices nas colunas mais utilizadas nos filtros.',
  'Verificar vulnerabilidades conhecidas com npm audit.',
  'Revisar lógica de negócio e sugerir melhorias de performance.',
  null,
  'Evitar chamadas repetidas ao banco para dados que raramente mudam.',
  'Implementar cursor-based ou offset-based pagination.',
  'Nunca commitar credenciais; usar .env.example como referência.',
  'Testar fluxos completos de criação, edição e exclusão.',
  null,
  'Manter histórico de exclusão para fins de auditoria.',
  'Usar tsvector para buscas eficientes em PostgreSQL.',
  'Restringir origens permitidas conforme política de segurança.',
  'Atualizar cabeçalhos HTTP de segurança (Helmet, CSP).',
  null,
  'Usar Nodemailer com template HTML para confirmação de cadastro.',
  'Notificar usuário em tempo real ao atualizar status de tarefa.',
  'Usar biblioteca especializada para validação de documentos.',
  'Consolidar dados de produtividade do mês anterior.',
  null,
  'Habilitar strict: true no tsconfig e corrigir os erros resultantes.',
  'Limitar requisições por IP para evitar abuso da API.',
  'Garantir rastreabilidade de todas as ações dos usuários.',
  null,
  'Alternar tema claro/escuro com preferência salva no localStorage.',
  'Suportar pt-BR e en-US inicialmente.',
  'Investigar vazamento identificado no profiling de memória.',
  'Usar tree-shaking e code splitting para reduzir tamanho final.',
  null,
  'Exibir placeholder animado enquanto o conteúdo carrega.',
  'Seguir WCAG 2.1 nível AA para todos os componentes.',
  'Cobrir jornadas críticas: login, criação e exclusão de tarefas.',
  null,
  'Reduzir payload de resposta com compressão no nível do servidor.',
  'Aceitar imagens e documentos com validação de tipo e tamanho.',
  'Disparar eventos para sistemas externos ao criar/atualizar tarefas.',
  null,
  'Padronizar nomenclatura e organização de acordo com o guia de estilo.',
  'Implementar lógica de backoff exponencial para chamadas externas.',
  null,
  'Definir thresholds de latência e alertar via Slack.',
  'Usar TOTP (Google Authenticator) como segundo fator.',
  'Documentar processo de setup local e padrões de commit.',
  null,
];

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

function randomStatus(): TaskStatus {
  const weights = [0.5, 0.3, 0.2]; // 50% TODO, 30% IN_PROGRESS, 20% DONE
  const rand = Math.random();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (rand < acc) return STATUSES[i];
  }
  return 'TODO';
}

function randomDueDate(): Date | null {
  if (Math.random() < 0.3) return null; // 30% sem data de vencimento
  const now = new Date();
  const offsetDays = Math.floor(Math.random() * 90) - 15; // -15 a +75 dias
  const date = new Date(now);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

// ─── seed ────────────────────────────────────────────────────────────────────

async function main() {
  const EMAIL = 'luiz.teste@email.com';

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error(`Usuário não encontrado: ${EMAIL}`);
    console.error('Execute "npm run seed:user" primeiro.');
    process.exit(1);
  }

  const existing = await prisma.task.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`O usuário já possui ${existing} tarefa(s). Seed ignorado.`);
    console.log('Remova as tarefas existentes se quiser recriar o seed.');
    return;
  }

  const tasks = Array.from({ length: 50 }, (_, i) => ({
    title: TITLES[i % TITLES.length],
    description: DESCRIPTIONS[i % DESCRIPTIONS.length],
    status: randomStatus(),
    dueDate: randomDueDate(),
    userId: user.id,
  }));

  const { count } = await prisma.task.createMany({ data: tasks });

  console.log(`${count} tarefas criadas com sucesso para ${EMAIL}!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
