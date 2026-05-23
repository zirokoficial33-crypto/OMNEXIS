import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues ?? [];
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: issues.map((e: any) => ({
          campo: Array.isArray(e.path) && e.path.length > 0 ? e.path.join('.') : 'body',
          mensaje: e.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}
