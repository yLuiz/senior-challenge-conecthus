import 'dotenv/config';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  validateEnv(process.env as Record<string, unknown>);

  const logger = new Logger();

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (requestOrigin, callback) => {
      // Requests sem origin (mobile, Postman, curl) são sempre permitidos
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origem não permitida por CORS: ${requestOrigin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Task Manager API')
    .setDescription('API para gerenciamento de tarefas com autenticação JWT, cache Redis e notificações MQTT')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);


  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('\n\n')
  logger.debug(`🚀 Application running on: http://localhost:${port}`, 'Bootstrap');
  logger.debug(`📝 Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
  console.log('\n\n')
}

bootstrap();
