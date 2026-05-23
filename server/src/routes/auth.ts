import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  clave: z.string().min(6, 'La clave debe tener al menos 6 caracteres'),
  rol: z.enum(['OPERADOR', 'SOBERANO', 'AUDITOR']).default('OPERADOR'),
});

const CLAVES: Record<string, string> = {
  OPERADOR:  process.env.CLAVE_OPERADOR  || 'operador123',
  SOBERANO:  process.env.CLAVE_SOBERANO  || 'soberano456',
  AUDITOR:   process.env.CLAVE_AUDITOR   || 'auditor789',
};

router.post('/login', validate(loginSchema), (req, res) => {
  const { clave, rol } = req.body as z.infer<typeof loginSchema>;
  const claveEsperada = CLAVES[rol];

  if (!claveEsperada || clave !== claveEsperada) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = generateToken({
    id: `${rol.toLowerCase()}-${Date.now()}`,
    rol,
  });

  res.json({
    token,
    rol,
    expira: '8h',
    mensaje: `Acceso soberano concedido — rol ${rol}`,
  });
});

router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({ usuario: req.user });
});

router.post('/verificar', authenticateToken, (req: AuthRequest, res) => {
  res.json({ valido: true, usuario: req.user });
});

export default router;
