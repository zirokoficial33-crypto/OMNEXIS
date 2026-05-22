import { Router } from 'express';
import { db, activosReales, libroMayorZircoin, cuentasSoberanas, prestamosSoberanos, bancoCentralZirok, historialExpansion, alertasSistema, operacionesCuenta } from '../db';
import { eq, desc, sql, gte, and } from 'drizzle-orm';

const router = Router();

const PHI = 1.618033988749895;

// GET /api/inteligencia/panorama — visión completa del sistema
router.get('/panorama', async (_req, res) => {
  try {
    // === BANCO CENTRAL ===
    const [banco] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));

    // === ACTIVOS ===
    const [activosStats] = await db.select({
      total: sql<number>`count(*)`,
      valor: sql<number>`coalesce(sum(valor_tasa_zircoin::numeric), 0)`,
      operativos: sql<number>`count(*) filter (where estado_disponibilidad = 'OPERATIVO')`,
    }).from(activosReales);

    // === CIRCULACIÓN ===
    const [circulacion] = await db.select({
      total: sql<number>`coalesce(sum(monto_emitido::numeric), 0)`,
      operaciones: sql<number>`count(*)`,
    }).from(libroMayorZircoin);

    // === CUENTAS ===
    const [cuentasStats] = await db.select({
      total: sql<number>`count(*)`,
      activas: sql<number>`count(*) filter (where estado = 'ACTIVA')`,
      saldoTotal: sql<number>`coalesce(sum(saldo::numeric), 0)`,
    }).from(cuentasSoberanas);

    const distribucionTipo = await db.select({
      tipo: cuentasSoberanas.tipo,
      cantidad: sql<number>`count(*)`,
      saldo: sql<number>`coalesce(sum(saldo::numeric), 0)`,
    }).from(cuentasSoberanas).groupBy(cuentasSoberanas.tipo);

    // === PRÉSTAMOS ===
    const [prestamosStats] = await db.select({
      total: sql<number>`count(*)`,
      activos: sql<number>`count(*) filter (where estado = 'ACTIVO')`,
      vencidos: sql<number>`count(*) filter (where estado = 'VENCIDO')`,
      totalRestante: sql<number>`coalesce(sum(case when estado = 'ACTIVO' then monto_restante::numeric else 0 end), 0)`,
      totalIntereses: sql<number>`coalesce(sum(total_intereses::numeric), 0)`,
    }).from(prestamosSoberanos);

    // === ALERTAS ===
    const [alertasStats] = await db.select({
      total: sql<number>`count(*)`,
      noLeidas: sql<number>`count(*) filter (where leida = false)`,
      criticas: sql<number>`count(*) filter (where nivel = 'CRITICAL' and leida = false)`,
    }).from(alertasSistema);

    // === VELOCIDAD DE EXPANSIÓN (últimas 10 entradas historial) ===
    const historial = await db.select().from(historialExpansion).orderBy(desc(historialExpansion.timestamp)).limit(10);
    let velocidadExpansion = 0;
    if (historial.length >= 2) {
      const reciente = historial.slice(0, 5);
      velocidadExpansion = reciente.reduce((s, h) => s + Number(h.deltaEmitido), 0) / reciente.length;
    }

    // === HEALTH SCORE (0–100) ===
    let score = 100;
    if (Number(prestamosStats.vencidos) > 0) score -= Number(prestamosStats.vencidos) * 10;
    if (Number(alertasStats.criticas) > 0) score -= Number(alertasStats.criticas) * 15;
    const saldoTotal = Number(cuentasStats.saldoTotal);
    const restanteTotal = Number(prestamosStats.totalRestante);
    if (saldoTotal > 0 && restanteTotal / saldoTotal > 0.7) score -= 20;
    score = Math.max(0, Math.min(100, score));

    // === PROYECCIÓN PRÓXIMOS 7 DÍAS (crecimiento φ) ===
    const baseExpansion = Number(banco?.totalEmitido ?? 0);
    const proyeccion7d = Array.from({ length: 7 }, (_, i) => ({
      dia: i + 1,
      proyectado: Number((baseExpansion * Math.pow(PHI, (i + 1) / 30)).toFixed(2)),
    }));

    // === OPERACIONES RECIENTES (últimas 24h) ===
    const hace24h = new Date(Date.now() - 86_400_000);
    const [ops24h] = await db.select({
      count: sql<number>`count(*)`,
      volumen: sql<number>`coalesce(sum(monto::numeric), 0)`,
    }).from(operacionesCuenta).where(gte(operacionesCuenta.timestamp, hace24h));

    res.json({
      banco: banco ?? null,
      activos: {
        total: Number(activosStats.total),
        valorTotal: Number(activosStats.valor),
        operativos: Number(activosStats.operativos),
      },
      circulacion: {
        totalEmitido: Number(circulacion.total),
        totalOperaciones: Number(circulacion.operaciones),
      },
      cuentas: {
        total: Number(cuentasStats.total),
        activas: Number(cuentasStats.activas),
        saldoTotal: Number(cuentasStats.saldoTotal),
        distribucionTipo,
      },
      prestamos: {
        total: Number(prestamosStats.total),
        activos: Number(prestamosStats.activos),
        vencidos: Number(prestamosStats.vencidos),
        totalRestante: Number(prestamosStats.totalRestante),
        totalIntereses: Number(prestamosStats.totalIntereses),
      },
      alertas: {
        total: Number(alertasStats.total),
        noLeidas: Number(alertasStats.noLeidas),
        criticas: Number(alertasStats.criticas),
      },
      inteligencia: {
        healthScore: score,
        velocidadExpansion,
        factorPhi: PHI,
        proyeccion7d,
        ops24h: {
          count: Number(ops24h.count),
          volumen: Number(ops24h.volumen),
        },
      },
    });
  } catch (e: any) {
    console.error('[INTELIGENCIA]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
