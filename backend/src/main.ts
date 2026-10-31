import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BACKEND_CONFIG, type BackendConfig } from './config/backend-config';
import { configureHttp } from './config/configure-http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';

async function bootstrap() {
  const envFile = path.resolve(__dirname, '../.env');
  if (existsSync(envFile)) loadEnvFile(envFile);
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get<BackendConfig>(BACKEND_CONFIG);
  configureHttp(app, config);
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
}
void bootstrap().catch((error: unknown) => {
  console.error('Backend startup failed', error);
  process.exitCode = 1;
});
