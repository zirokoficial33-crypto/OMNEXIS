import { Router } from 'express';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { CertificadosController } from '../controllers/certificados.controller';
import {
  emitirCertificadoSchema,
  transferirCertificadoSchema,
  redimirCertificadoSchema,
} from '../schemas';

const router = Router();

// ─── LECTURA ──────────────────────────────────────────────────────────────────
router.get('/',                asyncHandler(CertificadosController.listar));
router.get('/stats',           asyncHandler(CertificadosController.stats));
router.get('/:id/movimientos', asyncHandler(CertificadosController.movimientos));

// ─── ESCRITURA (requiere JWT) ─────────────────────────────────────────────────
router.post(
  '/',
  authenticateToken,
  validate(emitirCertificadoSchema),
  asyncHandler(CertificadosController.emitir),
);

router.post(
  '/:id/transferir',
  authenticateToken,
  validate(transferirCertificadoSchema),
  asyncHandler(CertificadosController.transferir),
);

router.post(
  '/:id/redimir',
  authenticateToken,
  validate(redimirCertificadoSchema),
  asyncHandler(CertificadosController.redimir),
);

export default router;
