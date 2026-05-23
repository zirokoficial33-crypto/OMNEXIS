import { Router } from 'express';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { CuentasController } from '../controllers/cuentas.controller';
import {
  crearCuentaSchema,
  depositarSchema,
  retirarSchema,
  transferirSchema,
} from '../schemas';

const router = Router();

// ─── LECTURA (pública dentro de la red interna) ───────────────────────────────
router.get('/',                  asyncHandler(CuentasController.listar));
router.get('/stats',             asyncHandler(CuentasController.stats));
router.get('/:id',               asyncHandler(CuentasController.get));
router.get('/:id/operaciones',   asyncHandler(CuentasController.operaciones));

// ─── ESCRITURA (requiere JWT) ─────────────────────────────────────────────────
router.post(
  '/',
  authenticateToken,
  validate(crearCuentaSchema),
  asyncHandler(CuentasController.crear),
);

router.post(
  '/:id/depositar',
  authenticateToken,
  validate(depositarSchema),
  asyncHandler(CuentasController.depositar),
);

router.post(
  '/:id/retirar',
  authenticateToken,
  validate(retirarSchema),
  asyncHandler(CuentasController.retirar),
);

router.post(
  '/transferir',
  authenticateToken,
  validate(transferirSchema),
  asyncHandler(CuentasController.transferir),
);

router.patch(
  '/:id/estado',
  authenticateToken,
  asyncHandler(CuentasController.cambiarEstado),
);

export default router;
