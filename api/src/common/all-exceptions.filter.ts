import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

interface HttpReq { method: string; url: string }
interface HttpRes { status(code: number): { json(body: unknown): void } }

// Traduce errores de MongoDB/Mongoose a codigos HTTP coherentes y registra cada fallo.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<HttpReq>();
    const res = ctx.getResponse<HttpRes>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Error interno del servidor';
    const err = exception as { code?: number; name?: string; keyValue?: unknown; message?: string };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : ((body as { message?: unknown }).message ?? body);
    } else if (err?.code === 11000) {
      status = HttpStatus.CONFLICT;
      message = { texto: 'Registro duplicado (clave unica)', clave: err.keyValue };
    } else if (
      ['MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError'].includes(err?.name ?? '')
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Sin conexion con la base de datos';
    } else if (err?.name === 'CastError' || err?.name === 'ValidationError') {
      status = HttpStatus.BAD_REQUEST;
      message = err.message;
    }

    const line = `${req.method} ${req.url} -> ${status} | ${typeof message === 'string' ? message : JSON.stringify(message)}`;
    if (status >= 500) this.logger.error(line, (exception as Error)?.stack);
    else this.logger.warn(line);

    res.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
