import { Router } from 'express';
import { db, bancoCentralZirok, historialExpansion, activosReales } from '../db';
import { eq, sql, desc } from 'drizzle-orm';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [banco] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
    res.json(banco || null);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener banco central' });
  }
});

router.get('/historial', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const registros = await db
      .select()
      .from(historialExpansion)
      .orderBy(desc(historialExpansion.timestamp))
      .limit(limit);
    res.json(registros);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
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

router.post('/activar-expansion', async (req, res) => {
  try {
    const { nombreActivo, valorZircoin, categoria, descripcion } = req.body;
    if (!nombreActivo || !valorZircoin) {
      return res.status(400).json({ error: 'Nombre y valor requeridos' });
    }
    const [activo] = await db.insert(activosReales).values({
      nombreActivo,
      valorTasaZircoin: String(valorZircoin),
      estadoDisponibilidad: 'OPERATIVO',
      categoria: categoria || 'EXPANSION',
      descripcion: descripcion || `Expansión Infinita — ${nombreActivo}`,
    }).returning();

    const [banco] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
    res.status(201).json({ activo, banco });
  } catch (err) {
    res.status(500).json({ error: 'Error al activar expansión' });
  }
});

export default router;
