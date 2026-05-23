import { Router } from 'express';
import { db, cuentasSoberanas, operacionesCuenta } from '../db';
import { eq, desc, sql } from 'drizzle-orm';
import { validate } from '../middleware/validate';
import { crearCuentaSchema, depositarSchema, retirarSchema, transferirSchema } from '../schemas';

const router = Router();

function generarNumeroCuenta(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ZCK-${ts}-${rand}`;
}

function generarReferencia(): string {
  return 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// GET /api/cuentas — listar todas
router.get('/', async (_req, res) => {
  try {
    const cuentas = await db.select().from(cuentasSoberanas).orderBy(desc(cuentasSoberanas.fechaApertura));
    res.json(cuentas);
  } catch {
    res.status(500).json({ error: 'Error al obtener cuentas' });
  }
});

// GET /api/cuentas/stats — métricas generales
router.get('/stats', async (_req, res) => {
  try {
    const [totalCuentas] = await db.select({ count: sql<number>`count(*)` }).from(cuentasSoberanas);
    const [saldoTotal] = await db.select({ sum: sql<number>`coalesce(sum(saldo), 0)` }).from(cuentasSoberanas);
    const [totalOps] = await db.select({ count: sql<number>`count(*)` }).from(operacionesCuenta);
    const [activas] = await db.select({ count: sql<number>`count(*)` }).from(cuentasSoberanas).where(eq(cuentasSoberanas.estado, 'ACTIVA'));
    res.json({
      totalCuentas: Number(totalCuentas.count),
      saldoTotal: Number(saldoTotal.sum),
      totalOperaciones: Number(totalOps.count),
      cuentasActivas: Number(activas.count),
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/cuentas/:id — detalle de cuenta
router.get('/:id', async (req, res) => {
  try {
    const [cuenta] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.id, Number(req.params.id)));
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(cuenta);
  } catch {
    res.status(500).json({ error: 'Error al obtener cuenta' });
  }
});

// GET /api/cuentas/:id/operaciones — historial de operaciones
router.get('/:id/operaciones', async (req, res) => {
  try {
    const ops = await db.select().from(operacionesCuenta)
      .where(eq(operacionesCuenta.idCuenta, Number(req.params.id)))
      .orderBy(desc(operacionesCuenta.timestamp))
      .limit(50);
    res.json(ops);
  } catch {
    res.status(500).json({ error: 'Error al obtener operaciones' });
  }
});

// POST /api/cuentas — crear cuenta
router.post('/', validate(crearCuentaSchema), async (req, res) => {
  try {
    const { titular, tipo, saldoInicial } = req.body;
    const numeroCuenta = generarNumeroCuenta();
    const saldo = saldoInicial ? String(Number(saldoInicial).toFixed(4)) : '0.0000';
    const [cuenta] = await db.insert(cuentasSoberanas).values({
      numeroCuenta,
      titular,
      tipo: tipo || 'PERSONAL',
      saldo,
      estado: 'ACTIVA',
    }).returning();

    if (Number(saldo) > 0) {
      await db.insert(operacionesCuenta).values({
        idCuenta: cuenta.id,
        tipo: 'APERTURA',
        monto: saldo,
        saldoAnterior: '0.0000',
        saldoResultante: saldo,
        descripcion: `Apertura de cuenta — saldo inicial`,
        referencia: generarReferencia(),
      });
    }

    res.status(201).json(cuenta);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error al crear cuenta' });
  }
});

// POST /api/cuentas/:id/depositar
router.post('/:id/depositar', validate(depositarSchema), async (req, res) => {
  try {
    const { monto, descripcion } = req.body;
    const montoNum = Number(monto);

    const [cuenta] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.id, Number(req.params.id)));
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
    if (cuenta.estado !== 'ACTIVA') return res.status(400).json({ error: 'Cuenta no activa' });

    const saldoAnterior = Number(cuenta.saldo);
    const saldoNuevo = (saldoAnterior + montoNum).toFixed(4);

    const [actualizada] = await db.update(cuentasSoberanas)
      .set({ saldo: saldoNuevo, ultimaOperacion: new Date() })
      .where(eq(cuentasSoberanas.id, cuenta.id))
      .returning();

    const [op] = await db.insert(operacionesCuenta).values({
      idCuenta: cuenta.id,
      tipo: 'DEPOSITO',
      monto: montoNum.toFixed(4),
      saldoAnterior: saldoAnterior.toFixed(4),
      saldoResultante: saldoNuevo,
      descripcion: descripcion || 'Depósito ZIRCOIN',
      referencia: generarReferencia(),
    }).returning();

    res.json({ cuenta: actualizada, operacion: op });
  } catch {
    res.status(500).json({ error: 'Error al procesar depósito' });
  }
});

// POST /api/cuentas/:id/retirar
router.post('/:id/retirar', validate(retirarSchema), async (req, res) => {
  try {
    const { monto, descripcion } = req.body;
    const montoNum = Number(monto);

    const [cuenta] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.id, Number(req.params.id)));
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
    if (cuenta.estado !== 'ACTIVA') return res.status(400).json({ error: 'Cuenta no activa' });

    const saldoAnterior = Number(cuenta.saldo);
    if (saldoAnterior < montoNum) return res.status(400).json({ error: 'Saldo insuficiente' });

    const saldoNuevo = (saldoAnterior - montoNum).toFixed(4);
    const [actualizada] = await db.update(cuentasSoberanas)
      .set({ saldo: saldoNuevo, ultimaOperacion: new Date() })
      .where(eq(cuentasSoberanas.id, cuenta.id))
      .returning();

    const [op] = await db.insert(operacionesCuenta).values({
      idCuenta: cuenta.id,
      tipo: 'RETIRO',
      monto: montoNum.toFixed(4),
      saldoAnterior: saldoAnterior.toFixed(4),
      saldoResultante: saldoNuevo,
      descripcion: descripcion || 'Retiro ZIRCOIN',
      referencia: generarReferencia(),
    }).returning();

    res.json({ cuenta: actualizada, operacion: op });
  } catch {
    res.status(500).json({ error: 'Error al procesar retiro' });
  }
});

// POST /api/cuentas/transferir — transferencia entre cuentas
router.post('/transferir', validate(transferirSchema), async (req, res) => {
  try {
    const { numeroCuentaOrigen, numeroCuentaDestino, monto, descripcion } = req.body;
    const montoNum = Number(monto);

    const [origen] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.numeroCuenta, numeroCuentaOrigen));
    const [destino] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.numeroCuenta, numeroCuentaDestino));

    if (!origen) return res.status(404).json({ error: 'Cuenta origen no encontrada' });
    if (!destino) return res.status(404).json({ error: 'Cuenta destino no encontrada' });
    if (origen.estado !== 'ACTIVA') return res.status(400).json({ error: 'Cuenta origen no activa' });
    if (destino.estado !== 'ACTIVA') return res.status(400).json({ error: 'Cuenta destino no activa' });

    const saldoOrigen = Number(origen.saldo);
    if (saldoOrigen < montoNum) return res.status(400).json({ error: `Saldo insuficiente — Disponible: ${saldoOrigen.toFixed(4)} ZC` });

    const nuevoSaldoOrigen = (saldoOrigen - montoNum).toFixed(4);
    const nuevoSaldoDestino = (Number(destino.saldo) + montoNum).toFixed(4);
    const referencia = generarReferencia();
    const desc = descripcion || `Transferencia a ${numeroCuentaDestino}`;
    const now = new Date();

    const [origenActualizado] = await db.update(cuentasSoberanas)
      .set({ saldo: nuevoSaldoOrigen, ultimaOperacion: now })
      .where(eq(cuentasSoberanas.id, origen.id)).returning();

    const [destinoActualizado] = await db.update(cuentasSoberanas)
      .set({ saldo: nuevoSaldoDestino, ultimaOperacion: now })
      .where(eq(cuentasSoberanas.id, destino.id)).returning();

    await db.insert(operacionesCuenta).values([
      {
        idCuenta: origen.id,
        tipo: 'TRANSFERENCIA_SALIDA',
        monto: montoNum.toFixed(4),
        saldoAnterior: saldoOrigen.toFixed(4),
        saldoResultante: nuevoSaldoOrigen,
        descripcion: desc,
        cuentaContraparte: numeroCuentaDestino,
        referencia,
      },
      {
        idCuenta: destino.id,
        tipo: 'TRANSFERENCIA_ENTRADA',
        monto: montoNum.toFixed(4),
        saldoAnterior: Number(destino.saldo).toFixed(4),
        saldoResultante: nuevoSaldoDestino,
        descripcion: `Recibido de ${numeroCuentaOrigen}`,
        cuentaContraparte: numeroCuentaOrigen,
        referencia,
      },
    ]);

    res.json({ origen: origenActualizado, destino: destinoActualizado, referencia, monto: montoNum });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error al procesar transferencia' });
  }
});

// PATCH /api/cuentas/:id/estado
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['ACTIVA', 'SUSPENDIDA', 'CERRADA'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    const [updated] = await db.update(cuentasSoberanas)
      .set({ estado })
      .where(eq(cuentasSoberanas.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

export default router;
