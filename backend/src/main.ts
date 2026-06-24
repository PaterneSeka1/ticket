import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

const REQUIRED_ENV_VARS = ['DATABASE_URL'];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Variables d'environnement manquantes : ${missing.join(', ')}`);
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  if (process.env.LOG_HTTP === 'true') {
    app.use((req: any, _res: any, next: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const hasAuth = Boolean(req.headers?.authorization);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const origin = req.headers?.origin ?? '-';
      console.log(
        `[HTTP] ${req.method} ${req.url} auth=${hasAuth ? 'yes' : 'no'} origin=${origin}`,
      );
      next();
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '127.0.0.1';

  if (process.env.LOG_ROUTES === 'true') {
    const instance = app.getHttpAdapter().getInstance();
    const stack = instance?._router?.stack ?? [];
    const routes = stack
      .filter((layer: any) => layer?.route)
      .map((layer: any) => {
        const methods = Object.keys(layer.route.methods ?? {})
          .filter((method) => layer.route.methods[method])
          .map((method) => method.toUpperCase())
          .join(',');
        return `${methods} ${layer.route.path}`;
      })
      .sort();
    console.log('[ROUTES]');
    routes.forEach((line: string) => console.log(`- ${line}`));
  }

  await app.listen(port, host);
  console.log(`Server running on ${host}:${port}`);
}

void bootstrap();
