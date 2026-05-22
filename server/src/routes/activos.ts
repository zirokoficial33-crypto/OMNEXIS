import { Router } from 'express';
import { db, activosReales } from '../db';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const activos = await db.select().from(activosReales).orderBy(activosReales.fechaCreacion);
    res.json(activos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener activos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [activo] = await db.select().from(activosReales).where(eq(activosReales.id, Number(req.params.id)));
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });
    res.json(activo);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener activo' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombreActivo, valorTasaZircoin, estadoDisponibilidad, categoria, descripcion } = req.body;
    const [nuevo] = await db.insert(activosReales).values({
      nombreActivo,
      valorTasaZircoin,
      estadoDisponibilidad: estadoDisponibilidad || 'OPERATIVO',
      categoria: categoria || 'GENERAL',
      descripcion,
    }).returning();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear activo' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nombreActivo, valorTasaZircoin, estadoDisponibilidad, categoria, descripcion } = req.body;
    const [updated] = await db.update(activosReales)
      .set({ nombreActivo, valorTasaZircoin, estadoDisponibilidad, categoria, descripcion })
      .where(eq(activosReales.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Activo no encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar activo' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.delete(activosReales).where(eq(activosReales.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar activo' });
  }
});

export default router;
