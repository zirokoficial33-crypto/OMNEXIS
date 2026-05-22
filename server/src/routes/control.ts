import { Router } from 'express';
import { db, controlSoberano } from '../db';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const comandos = await db.select().from(controlSoberano).orderBy(desc(controlSoberano.fechaEjecucion));
    res.json(comandos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener comandos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { comandoEjecutado, nivelPrioridad, operador } = req.body;
    const [cmd] = await db.insert(controlSoberano).values({
      comandoEjecutado,
      nivelPrioridad: nivelPrioridad || 1,
      ejecucionFinalizada: false,
      operador: operador || 'SISTEMA_CENTRAL',
    }).returning();
    res.status(201).json(cmd);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear comando' });
  }
});

router.patch('/:id/completar', async (req, res) => {
  try {
    const { resultado } = req.body;
    const [updated] = await db.update(controlSoberano)
      .set({ ejecucionFinalizada: true, resultado: resultado || 'EJECUTADO_CON_EXITO' })
      .where(eq(controlSoberano.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Comando no encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al completar comando' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.delete(controlSoberano).where(eq(controlSoberano.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar comando' });
  }
});

export default router;
