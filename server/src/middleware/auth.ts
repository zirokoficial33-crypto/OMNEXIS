import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zircoin-sovereign-key-change-in-production';

export interface AuthRequest extends Request {
  user?: { id: string; rol: string; cuentaId?: number };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: token requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = decoded as AuthRequest['user'];
    next();
  });
}

export function generateToken(payload: { id: string; rol: string; cuentaId?: number }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) req.user = decoded as AuthRequest['user'];
    });
  }
  next();
}
