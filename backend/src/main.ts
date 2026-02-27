import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  validateEnv(process.env as Record<string, unknown>);

  const logger = new Logger();

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

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
