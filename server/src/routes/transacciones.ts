import { Router } from 'express';
import { db, libroMayorZircoin, activosReales } from '../db';
import { eq, desc } from 'drizzle-orm';

const router = Router();

function generarSerial(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

router.get('/', async (_req, res) => {
  try {
    const txs = await db
      .select({
        id: libroMayorZircoin.id,
        montoEmitido: libroMayorZircoin.montoEmitido,
        serialBillete: libroMayorZircoin.serialBillete,
        origen: libroMayorZircoin.origen,
        destino: libroMayorZircoin.destino,
        tipoOperacion: libroMayorZircoin.tipoOperacion,
        timestampEmision: libroMayorZircoin.timestampEmision,
        estatusEjecucion: libroMayorZircoin.estatusEjecucion,
        idActivoRespaldo: libroMayorZircoin.idActivoRespaldo,
        nombreActivo: activosReales.nombreActivo,
      })
      .from(libroMayorZircoin)
      .leftJoin(activosReales, eq(libroMayorZircoin.idActivoRespaldo, activosReales.id))
      .orderBy(desc(libroMayorZircoin.timestampEmision));
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

router.post('/emitir', async (req, res) => {
  try {
    const { montoEmitido, idActivoRespaldo, origen, destino } = req.body;
    const serial = generarSerial();
    const [tx] = await db.insert(libroMayorZircoin).values({
      montoEmitido,
      idActivoRespaldo: idActivoRespaldo || null,
      serialBillete: serial,
      origen: origen || 'BANCO_CENTRAL_ZIROK',
      destino: destino || 'CIRCULACION_SOBERANA',
      tipoOperacion: 'EMISION',
      estatusEjecucion: 'MANIFESTADO',
    }).returning();
    res.status(201).json({ ...tx, serial });
  } catch (err) {
    res.status(500).json({ error: 'Error al emitir ZIRCOIN' });
  }
});

router.post('/transferir', async (req, res) => {
  try {
    const { montoEmitido, origen, destino, idActivoRespaldo } = req.body;
    const serial = generarSerial();
    const [tx] = await db.insert(libroMayorZircoin).values({
      montoEmitido,
      idActivoRespaldo: idActivoRespaldo || null,
      serialBillete: serial,
      origen,
      destino,
      tipoOperacion: 'TRANSFERENCIA',
      estatusEjecucion: 'CONFIRMADO',
    }).returning();
    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ error: 'Error al ejecutar transferencia' });
  }
});

export default router;
