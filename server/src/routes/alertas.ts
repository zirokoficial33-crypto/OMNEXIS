import { Router } from 'express';
import { db, alertasSistema, cuentasSoberanas, prestamosSoberanos, bancoCentralZirok } from '../db';
import { eq, desc, and, lt, sql } from 'drizzle-orm';

const router = Router();

// GET /api/alertas — listar alertas
router.get('/', async (req, res) => {
  try {
    const { leida } = req.query;
    let query = db.select().from(alertasSistema).orderBy(desc(alertasSistema.timestamp)).limit(100);
    const alertas = await query;
    const filtradas = leida !== undefined ? alertas.filter(a => a.leida === (leida === 'true')) : alertas;
    res.json(filtradas);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/alertas/count — número sin leer
router.get('/count', async (_req, res) => {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(alertasSistema).where(eq(alertasSistema.leida, false));
    res.json({ noLeidas: Number(count) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/alertas/evaluar — motor de evaluación automática
router.post('/evaluar', async (_req, res) => {
  try {
    const nuevasAlertas: any[] = [];

    // 1. Detectar cuentas con saldo bajo (< 1000 ZC)
    const cuentasBajas = await db.select().from(cuentasSoberanas)
      .where(and(eq(cuentasSoberanas.estado, 'ACTIVA'), sql`saldo::numeric < 1000`));
    for (const c of cuentasBajas) {
      nuevasAlertas.push({
        tipo: 'SALDO_BAJO',
        nivel: 'WARNING',
        mensaje: `Cuenta ${c.titular} (${c.numeroCuenta}) tiene saldo bajo: ${Number(c.saldo).toFixed(2)} ZC`,
        entidadTipo: 'CUENTA',
        entidadId: c.id,
      });
    }

    // 2. Detectar préstamos vencidos
    const prestamosVencidos = await db.select({
      id: prestamosSoberanos.id,
      titular: cuentasSoberanas.titular,
      montoRestante: prestamosSoberanos.montoRestante,
    })
      .from(prestamosSoberanos)
      .leftJoin(cuentasSoberanas, eq(prestamosSoberanos.idCuentaDeudor, cuentasSoberanas.id))
      .where(and(eq(prestamosSoberanos.estado, 'ACTIVO'), lt(prestamosSoberanos.fechaVencimiento, new Date())));

    for (const p of prestamosVencidos) {
      await db.update(prestamosSoberanos).set({ estado: 'VENCIDO' }).where(eq(prestamosSoberanos.id, p.id));
      nuevasAlertas.push({
        tipo: 'PRESTAMO_VENCIDO',
        nivel: 'CRITICAL',
        mensaje: `Préstamo #${p.id} de ${p.titular} VENCIDO — restante: ${Number(p.montoRestante).toFixed(2)} ZC`,
        entidadTipo: 'PRESTAMO',
        entidadId: p.id,
      });
    }

    // 3. Evaluar expansión del banco central
    const [banco] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
    if (banco && Number(banco.totalEmitido) > 1_000_000) {
      nuevasAlertas.push({
        tipo: 'EXPANSION_MILESTONE',
        nivel: 'INFO',
        mensaje: `El Banco Central Zirok supera 1,000,000 ZC emitidos — Total: ${Number(banco.totalEmitido).toLocaleString('es-ES')} ZC`,
        entidadTipo: 'BANCO',
        entidadId: 1,
      });
    }

    if (nuevasAlertas.length > 0) {
      await db.insert(alertasSistema).values(nuevasAlertas);
    }

    res.json({ alertasGeneradas: nuevasAlertas.length, alertas: nuevasAlertas });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/alertas/:id/leer
router.patch('/:id/leer', async (req, res) => {
  try {
    await db.update(alertasSistema).set({ leida: true }).where(eq(alertasSistema.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/alertas/leer-todas
router.patch('/leer-todas', async (_req, res) => {
  try {
    await db.update(alertasSistema).set({ leida: true }).where(eq(alertasSistema.leida, false));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
