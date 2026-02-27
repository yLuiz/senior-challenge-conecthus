# Desafio Técnico Sênior: Conecthus

Aplicação full stack de gerenciamento de tarefas desenvolvida como desafio técnico.

## Stack

| Camada   | Tecnologias                                                              |
|----------|--------------------------------------------------------------------------|
| Backend  | NestJS 10 · Prisma 7 · Node.js 20 · PostgreSQL 16 · Redis 7 · MQTT      |
| Frontend | React 18 · Vite 6 · TypeScript 5                                         |
| Mobile   | React Native 0.81 · Expo SDK 54                                          |
| Infra    | Docker Compose v2 · Nginx 1.27 · Mosquitto 2                             |

## Segurança

**Backend**
- Helmet: headers HTTP de segurança (HSTS, X-Frame-Options, CSP, etc.)
- Rate limiting global (60 req/min) com limite mais restrito nas rotas de auth (5 req/min)
- CORS com whitelist de origens via variável de ambiente
- JWT de curta duração (access 15 min + refresh 7 dias) com segredos separados
- Blacklist de access token no logout via Redis (invalidação por JTI)
- Senhas fortes obrigatórias (mínimo 8 caracteres, maiúscula, número e caractere especial)
- ValidationPipe global com `whitelist` e `forbidNonWhitelisted` (rejeita campos extras)
- `@Exclude` + `ClassSerializerInterceptor` global (campo `password` nunca exposto nas respostas)
- Sanitização de logs: campos sensíveis substituídos por `[REDACTED]` antes de logar
- Validação de variáveis de ambiente no startup (falha rápida se alguma obrigatória estiver ausente)

**Frontend e Mobile**
- Interceptor Axios que injeta o access token automaticamente em cada requisição
- Refresh automático do access token em caso de 401, com fila de requisições pendentes para evitar race conditions (mobile)
- Rotas protegidas: redireciona para login se não autenticado
- Logout chama o endpoint do backend para invalidar o token server-side

---

## Funcionalidades

- Autenticação completa: registro, login, refresh token e logout com JWT (access + refresh)
- Blacklist de access token no logout via Redis
- CRUD completo de tarefas com filtros por status, busca textual e data de vencimento
- Paginação no backend e scroll infinito no frontend
- Cache de listagem e perfil com Redis
- Notificações em tempo real via MQTT por usuário
- App web responsivo e app mobile integrado à mesma API

## Estrutura do projeto

```
.
├── backend/     # API NestJS + Prisma + testes unitários e de integração
├── frontend/    # SPA React + Vite
├── mobile/      # App React Native + Expo
├── docker/      # docker-compose.yml + .env.example + mosquitto.conf
└── REQUERIMENTS.md
```

---

## Pré-requisitos

- **Docker** 24+ e **Docker Compose** v2 (`docker compose`)
- **Node.js** 20+ e **npm** 10+ (apenas para desenvolvimento local)
- **Expo Go** com suporte ao **SDK 54** no dispositivo ou emulador (apenas para mobile)

---

## Opção 1 - Docker (recomendado)

Sobe todos os serviços com um único comando: banco, cache, broker MQTT, API e frontend.

### 1. Configurar variáveis de ambiente

```bash
cd docker
cp .env.example .env
```

Edite `docker/.env` e substitua `JWT_SECRET` e `JWT_REFRESH_SECRET` por strings seguras antes de subir em produção.

> 🌐 **`CORS_ORIGINS`: por que essa variável existe?**
>
> O navegador bloqueia por padrão requisições feitas de uma origem (ex: `http://localhost`) para outra (ex: `http://localhost:3000`). Esse mecanismo chama-se **Same-Origin Policy**. O `CORS_ORIGINS` diz ao backend quais origens de frontend têm permissão para fazer requisições. Sem isso, toda chamada da interface web seria bloqueada pelo navegador com erro de CORS.
>
> No modo Docker, o frontend é servido pelo **Nginx na porta 80** (`http://localhost`), que já está incluída no valor padrão:
> ```
> CORS_ORIGINS=http://localhost,http://localhost:80
> ```
> Você só precisa alterar esse valor se acessar o frontend por outro host ou porta (ex: de outra máquina na rede).
>
> ℹ️ Requisições sem cabeçalho `Origin` (como as feitas por Postman, curl ou pelo app mobile) **nunca são bloqueadas por CORS** e independem dessa variável.

> 🔌 **`FRONTEND_PORT`: porta do frontend exposta no host**
>
> Por padrão, o Nginx é acessível na **porta `80`** do host (`http://localhost`). Se essa porta já estiver em uso, defina `FRONTEND_PORT` no `docker/.env` com outra porta antes de subir:
> ```
> FRONTEND_PORT=8080
> ```
> O frontend passará a ser acessível em `http://localhost:8080`. O Nginx dentro do container continua ouvindo na porta `80` internamente — apenas o mapeamento externo muda.

<br><br>
---
### Atenção
 ⚠️ **Atenção: qual `.env` é lido pelo Docker Compose?**

 Ao subir o ambiente completo com `docker compose`, o **único `.env` que importa é o `docker/.env`**. Pois ele centraliza todas as variáveis de ambiente do backend e do frontend em um único lugar.

 Os arquivos `.env` dentro das pastas `backend/` e `frontend/` **são ignorados pelo Docker Compose** e só têm efeito quando cada serviço é executado individualmente em modo de desenvolvimento local (Opção 2).

 📱 O mobile é a exceção: ele nunca roda via Docker, então o `mobile/.env` é **sempre** o arquivo relevante, independente do modo escolhido.

<br>

---
### 2. Subir o ambiente

```bash
# ⚠️ A partir da pasta raiz do projeto (diretório raíz do projeto)
docker compose -f docker/docker-compose.yml up -d --build
```

```bash
# Se quiser rodar o comando dentro do diretório ./docker, ai o comando será somente:
docker compose up -d --build
```

Na primeira execução o backend roda `prisma migrate deploy` automaticamente via Dockerfile.

### 3. Acessos

| Serviço        | URL                            |
|----------------|--------------------------------|
| Frontend       | http://localhost               |
| API            | http://localhost:3000/api      |
| Swagger        | http://localhost:3000/api/docs |
| MQTT WebSocket | ws://localhost:9001            |

### 4. Encerrar

```bash
docker compose -f docker/docker-compose.yml down      # mantém volumes
docker compose -f docker/docker-compose.yml down -v   # remove volumes também
```

---

## Opção 2 - Desenvolvimento local (sem Docker para a aplicação)

Ideal para hot reload e debug. A infraestrutura (banco, Redis, MQTT) ainda sobe via Docker.

### 1. Subir apenas a infraestrutura

```bash
cd docker
docker compose up -d postgres redis mqtt
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Antes de subir, edite `backend/.env` e defina `JWT_SECRET` e `JWT_REFRESH_SECRET` com strings seguras. O backend falha no startup se essas variáveis estiverem ausentes.

API disponível em: `http://localhost:3000/api`  
Swagger em: `http://localhost:3000/api/docs`

> 🌐 **`CORS_ORIGINS`: por que precisa ser configurado no desenvolvimento local?**
>
> Em modo dev, o Vite serve o frontend em `http://localhost:5173`. O backend roda em `http://localhost:3000`. São origens diferentes, e o navegador bloqueia requisições entre elas por padrão (Same-Origin Policy). Sem liberar essa origem, todas as chamadas da interface aparecerão com erro de CORS no console do browser.
>
> O valor padrão do `.env.example` só inclui `http://localhost` e `http://localhost:80` (portas do Nginx), então é necessário adicionar a porta do Vite manualmente:
> ```
> CORS_ORIGINS=http://localhost,http://localhost:80,http://localhost:5173
> ```
> ℹ️ O app mobile e ferramentas como Postman e curl não enviam cabeçalho `Origin`, portanto **nunca sofrem bloqueio de CORS** independentemente dessa configuração.

Variáveis relevantes do `backend/.env`:

| Variável                 | Padrão (local)                                              | Descrição                                  |
|--------------------------|-------------------------------------------------------------|--------------------------------------------|
| `DATABASE_URL`           | `postgresql://postgres:postgres@localhost:5432/taskmanager` | Conexão com o PostgreSQL                   |
| `JWT_SECRET`             | (obrigatório)                                               | Segredo do access token                    |
| `JWT_EXPIRATION`         | `15m`                                                       | Expiração do access token                  |
| `JWT_REFRESH_SECRET`     | (obrigatório)                                               | Segredo do refresh token                   |
| `JWT_REFRESH_EXPIRATION` | `7d`                                                        | Expiração do refresh token                 |
| `REDIS_HOST`             | `localhost`                                                 | Host do Redis                              |
| `REDIS_PORT`             | `6379`                                                      | Porta do Redis                             |
| `MQTT_BROKER_URL`        | `mqtt://localhost:1883`                                     | URL do broker MQTT                         |
| `CORS_ORIGINS`           | `http://localhost,http://localhost:80`                      | Origins permitidas (separadas por vírgula) |
| `PASSWORD_SALT`          | `12`                                                        | Rounds do bcrypt para hash de senha        |
| `REDIS_TTL`              | `3600`                                                      | TTL padrão do cache Redis (segundos)       |

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend disponível em: `http://localhost:5173`

Variáveis do `frontend/.env`:

| Variável        | Valor (local)               | Valor (Docker/Nginx)  |
|-----------------|-----------------------------|----------------------|
| `VITE_API_URL`  | `http://localhost:3000/api` | `/api`               |
| `VITE_MQTT_URL` | `ws://localhost:9001`       | `ws://localhost:9001`|

### 4. Mobile (Expo)

```bash
cd mobile
cp .env.example .env
npm install
npm run start
```

Escaneie o QR code com o **Expo Go (SDK 54)** ou pressione `a` (Android) / `i` (iOS Simulator).

> O app mobile usa **Expo SDK 54**. Certifique-se de que o Expo Go instalado no dispositivo é compatível com essa versão, a Play Store e a App Store sempre disponibilizam a versão mais recente, que costuma suportar o SDK atual.

Variáveis do `mobile/.env`:

| Variável                | Emulador Android             | Dispositivo físico                   |
|-------------------------|------------------------------|--------------------------------------|
| `EXPO_PUBLIC_API_URL`   | `http://10.0.2.2:3000/api`  | `http://<IP-da-máquina>:3000/api`   |
| `EXPO_PUBLIC_MQTT_URL`  | `ws://10.0.2.2:9001`        | `ws://<IP-da-máquina>:9001`         |

> Em iOS Simulator `localhost` funciona normalmente.

---

## Seeds (dados iniciais para teste manual)

**Modo local (Opção 2):** com o backend rodando:

```bash
cd backend
npm run seed:user   # cria o usuário de teste
npm run seed:tasks  # cria tarefas de exemplo vinculadas ao usuário
```

**Modo Docker (Opção 1):** execute dentro do container do backend:

```bash
docker exec taskmanager_backend npm run seed:user
docker exec taskmanager_backend npm run seed:tasks
```

Credenciais do usuário criado:

```
Email: luiz.teste@email.com
Senha: Luiz@123
```

---

## Testes

Para rodar os testes, é necessário instalar todas as dependências, configurar os .env corretamente.

### Backend
Antes do teste, certifique-se de executar:

``
npm install
npx prisma generate
npx prisma migrate deploy
``

```bash
cd backend

# Testes unitários (serviços, sem I/O externo)
npm test

# Cobertura dos testes unitários
npm run test:cov

# Testes de integração da camada HTTP (mocks de DB/Redis/MQTT, sem infra necessária)
npm run test:e2e

# Testes e2e reais: requer PostgreSQL + Redis rodando
# Execute antes: cd docker && docker compose up -d postgres redis mqtt
npm run test:e2e:real
```
### ⚠️ Observação
> `test:e2e` roda os arquivos `*.integration.spec.ts` com stubs de infraestrutura, não precisa de banco ativo.
>
> `test:e2e:real` roda `app.e2e-spec.ts` contra serviços reais e requer a infra Docker ativa.

### Frontend

```bash
cd frontend

# Testes unitários e de integração (Vitest + jsdom)
npm test

# Modo watch
npm run test:watch

# Cobertura
npm run test:coverage
```

### Mobile

```bash
cd mobile

# Testes unitários (Jest)
npm test

# Modo watch
npm run test:watch
```

---

## Rotas principais da API

Base URL: `http://localhost:3000/api`

**Auth**

| Método | Rota                | Autenticação     | Descrição                      |
|--------|---------------------|------------------|--------------------------------|
| POST   | `/v1/auth/register` | pública          | Cadastro + tokens              |
| POST   | `/v1/auth/login`    | pública          | Login + tokens                 |
| POST   | `/v1/auth/refresh`  | Bearer (refresh) | Renova tokens                  |
| POST   | `/v1/auth/logout`   | Bearer (refresh) | Invalida tokens                |
| GET    | `/v1/auth/me`       | Bearer (access)  | Perfil do usuário autenticado  |

**Tasks**

| Método | Rota            | Autenticação    | Descrição                  |
|--------|-----------------|-----------------|----------------------------|
| POST   | `/v1/tasks`     | Bearer (access) | Cria tarefa                |
| GET    | `/v1/tasks`     | Bearer (access) | Lista paginada com filtros |
| GET    | `/v1/tasks/:id` | Bearer (access) | Retorna uma tarefa         |
| PATCH  | `/v1/tasks/:id` | Bearer (access) | Atualiza tarefa            |
| DELETE | `/v1/tasks/:id` | Bearer (access) | Remove tarefa              |

Filtros disponíveis em `GET /v1/tasks`: `status`, `search`, `dueDateFrom`, `dueDateTo`, `page`, `limit`

Documentação interativa completa: **`http://localhost:3000/api/docs`** (Swagger UI)

---

## Troubleshooting

| Sintoma | Solução |
|---------|---------|
| Erro 429 (Too Many Requests) no login ou registro | Rate limiting ativo: máximo 5 requisições/min nos endpoints de auth. Aguarde 1 minuto e tente novamente |
| Erro de CORS no frontend local | Adicione `http://localhost:5173` em `CORS_ORIGINS` no `backend/.env` |
| `localhost` não funciona no mobile | Use o IP da máquina host (ex: `192.168.x.x`) ou `10.0.2.2` no emulador Android |
| Erro de conexão MQTT | Revise `VITE_MQTT_URL` / `EXPO_PUBLIC_MQTT_URL`; confirme que a porta `9001` está exposta |
| Erro de banco no backend | Valide `DATABASE_URL` e rode `npx prisma migrate deploy` |
| Porta ocupada (`3000`, `5432`, `6379`, `1883`, `9001`) | Finalize o processo ou contêiner conflitante antes de subir |
| Porta `80` ocupada (frontend) | Defina `FRONTEND_PORT=<outra porta>` no `docker/.env` (ex: `8080`) e acesse em `http://localhost:8080` |
| `prisma generate` falha no build Docker | Verifique se `DATABASE_URL` está definido como `ARG` no `Dockerfile` do backend |
