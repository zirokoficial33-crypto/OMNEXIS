import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  console.error('[ZIRCOIN CRITICAL]', err.stack ?? err.message);

  res.status(500).json({
    error: isProd
      ? 'Error interno del servidor soberano'
      : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
