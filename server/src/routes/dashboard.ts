import { Router } from 'express';
import { db, activosReales, libroMayorZircoin, controlSoberano } from '../db';
import { sql, eq } from 'drizzle-orm';

const router = Router();

router.get('/stats', async (_req, res) => {
  try {
    const [totalActivos] = await db.select({ count: sql<number>`count(*)` }).from(activosReales);
    const [totalEmitido] = await db.select({ sum: sql<number>`coalesce(sum(monto_emitido), 0)` }).from(libroMayorZircoin);
    const [totalTransacciones] = await db.select({ count: sql<number>`count(*)` }).from(libroMayorZircoin);
    const [comandosPendientes] = await db.select({ count: sql<number>`count(*)` }).from(controlSoberano).where(eq(controlSoberano.ejecucionFinalizada, false));
    const [valorActivos] = await db.select({ sum: sql<number>`coalesce(sum(valor_tasa_zircoin), 0)` }).from(activosReales);

    const activosPorEstado = await db
      .select({
        estado: activosReales.estadoDisponibilidad,
        count: sql<number>`count(*)`,
      })
      .from(activosReales)
      .groupBy(activosReales.estadoDisponibilidad);

    const emisionPorDia = await db
      .select({
        fecha: sql<string>`date_trunc('day', timestamp_emision)::date`,
        total: sql<number>`sum(monto_emitido)`,
      })
      .from(libroMayorZircoin)
      .groupBy(sql`date_trunc('day', timestamp_emision)`)
      .orderBy(sql`date_trunc('day', timestamp_emision)`)
      .limit(7);

    res.json({
      totalActivos: Number(totalActivos.count),
      totalEmitido: Number(totalEmitido.sum),
      totalTransacciones: Number(totalTransacciones.count),
      comandosPendientes: Number(comandosPendientes.count),
      valorReservas: Number(valorActivos.sum),
      activosPorEstado,
      emisionPorDia,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/actividad-reciente', async (_req, res) => {
  try {
    const txs = await db
      .select({
        id: libroMayorZircoin.id,
        montoEmitido: libroMayorZircoin.montoEmitido,
        serialBillete: libroMayorZircoin.serialBillete,
        tipoOperacion: libroMayorZircoin.tipoOperacion,
        estatusEjecucion: libroMayorZircoin.estatusEjecucion,
        timestampEmision: libroMayorZircoin.timestampEmision,
        nombreActivo: activosReales.nombreActivo,
      })
      .from(libroMayorZircoin)
      .leftJoin(activosReales, eq(libroMayorZircoin.idActivoRespaldo, activosReales.id))
      .orderBy(libroMayorZircoin.timestampEmision)
      .limit(10);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener actividad' });
  }
});

export default router;
