import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  if (process.env.LOG_HTTP === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    app.use((req: any, _res: any, next: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const hasAuth = Boolean(req.headers?.authorization);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const origin = req.headers?.origin ?? '-';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log(`[HTTP] ${req.method} ${req.url} auth=${hasAuth ? 'yes' : 'no'} origin=${origin}`);
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
  console.log(`Server is running on ${host}:${port}`);

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
}

void bootstrap();
