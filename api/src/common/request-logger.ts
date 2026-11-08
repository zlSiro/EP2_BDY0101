import { Logger } from '@nestjs/common';
import { appendFile, mkdir } from 'node:fs/promises';

interface Req { method: string; originalUrl: string }
interface Res { statusCode: number; on(ev: 'finish', cb: () => void): void }

const logger = new Logger('HTTP');
const LOG_DIR = 'logs';
const LOG_FILE = `${LOG_DIR}/api.log`;
const ready = mkdir(LOG_DIR, { recursive: true }).catch(() => undefined);

// Registro de actividad: una linea por peticion, en consola y en logs/api.log (trazabilidad).
export function requestLogger(req: Req, res: Res, next: () => void) {
  const inicio = Date.now();
  res.on('finish', () => {
    const linea = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - inicio}ms`;
    logger.log(linea);
    ready.then(() => appendFile(LOG_FILE, linea + '\n')).catch(() => undefined);
  });
  next();
}
