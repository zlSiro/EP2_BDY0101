import { Logger, ValidationPipe } from '@nestjs/common';
import { setServers } from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { requestLogger } from './common/request-logger.js';

async function bootstrap() {
  // Algunos routers rechazan consultas SRV de Node (querySrv ECONNREFUSED con mongodb+srv).
  // DNS_SERVERS (opcional, en .env) fuerza servidores DNS publicos solo para este proceso.
  const dnsServers = process.env.DNS_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (dnsServers?.length) {
    setServers(dnsServers);
    new Logger('Bootstrap').log(`DNS personalizado: ${dnsServers.join(', ')}`);
  }

  const app = await NestFactory.create(AppModule);

  // Validacion de entrada: rechaza campos desconocidos, tipos invalidos y obligatorios faltantes (HTTP 400)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(requestLogger);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`API escuchando en http://localhost:${port}`);
}
await bootstrap();
