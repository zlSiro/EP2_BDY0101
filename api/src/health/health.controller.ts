import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

// Prueba de conectividad con Atlas (ping real a la base).
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get()
  async check() {
    const inicio = Date.now();
    try {
      await this.conn.db!.admin().ping();
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'sin conexion' });
    }
    return {
      status: 'ok',
      db: this.conn.name,
      readyState: this.conn.readyState,
      latencia_ms: Date.now() - inicio,
      uptime_s: Math.round(process.uptime()),
    };
  }
}
