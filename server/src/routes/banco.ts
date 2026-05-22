import { Router } from 'express';
import { db, bancoCentralZirok } from '../db';
import { eq, sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [banco] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
    res.json(banco || null);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener banco central' });
  }
});

router.post('/inicializar', async (_req, res) => {
  try {
    const existing = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
    if (existing.length > 0) {
      return res.json({ mensaje: 'Banco ya inicializado', banco: existing[0] });
    }
    const [banco] = await db.insert(bancoCentralZirok).values({
      idBanco: 1,
      nombreBanco: 'Banco de Soberanía Absoluta',
      totalEmitido: '0.0000',
      factorCrecimiento: '1.618',
      transaccionesTotales: 0,
    }).returning();
    res.status(201).json(banco);
  } catch (err) {
    res.status(500).json({ error: 'Error al inicializar banco central' });
  }
});

router.post('/actualizar-emision', async (req, res) => {
  try {
    const { montoNuevo } = req.body;
    const factor = 1.618;
    const incremento = Number(montoNuevo) * factor;
    const [updated] = await db.update(bancoCentralZirok)
      .set({
        totalEmitido: sql`total_emitido + ${incremento}`,
        transaccionesTotales: sql`transacciones_totales + 1`,
        ultimaActualizacion: new Date(),
      })
      .where(eq(bancoCentralZirok.idBanco, 1))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar emisión' });
  }
});

export default router;
