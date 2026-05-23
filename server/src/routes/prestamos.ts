import { Router } from 'express';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { PrestamosController } from '../controllers/prestamos.controller';
import { crearPrestamoSchema, pagarPrestamoSchema } from '../schemas';

const router = Router();

// ─── LECTURA ──────────────────────────────────────────────────────────────────
router.get('/',          asyncHandler(PrestamosController.listar));
router.get('/stats',     asyncHandler(PrestamosController.stats));
router.get('/:id/pagos', asyncHandler(PrestamosController.pagos));

// ─── ESCRITURA (requiere JWT) ─────────────────────────────────────────────────
router.post(
  '/',
  authenticateToken,
  validate(crearPrestamoSchema),
  asyncHandler(PrestamosController.crear),
);

router.post(
  '/:id/pagar',
  authenticateToken,
  validate(pagarPrestamoSchema),
  asyncHandler(PrestamosController.pagar),
);

export default router;
