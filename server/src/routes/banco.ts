import { Router } from 'express';
import { db, bancoCentralZirok, historialExpansion, activosReales, ciclosCuanticos } from '../db';
import { eq, sql, desc } from 'drizzle-orm';

const router = Router();

const PHI = 1.618033988749895;

const DIMENSIONES = [
  { nombre: 'TEMPORAL',   color: '#f59e0b', simbolo: '⏳', energia: 1.000 },
  { nombre: 'ENERGETICA', color: '#0ea5e9', simbolo: '⚡', energia: 1.618 },
  { nombre: 'MATERIAL',   color: '#10b981', simbolo: '🔮', energia: 2.618 },
  { nombre: 'DATOS',      color: '#8b5cf6', simbolo: '∞',  energia: 4.236 },
  { nombre: 'SOBERANIA',  color: '#ef4444', simbolo: '👑', energia: 6.854 },
];

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
  } catch { res.status(500).json({ error: 'Error al activar expansión' }); }
});

// ─── CICLOS CUÁNTICOS ─────────────────────────────────────────────────────────
router.get('/ciclos-cuanticos', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 30;
    const ciclos = await db.select().from(ciclosCuanticos).orderBy(desc(ciclosCuanticos.timestamp)).limit(limit);
    res.json(ciclos);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/ciclos-cuanticos/stats', async (_req, res) => {
  try {
    const [stats] = await db.select({
      totalCiclos: sql<number>`count(*)`,
      totalDelta: sql<number>`coalesce(sum(delta::numeric), 0)`,
      maxFactor: sql<number>`coalesce(max(factor_aplicado::numeric), 1.618)`,
      energiaTotal: sql<number>`coalesce(sum(energia_cuantica::numeric), 0)`,
      ultimoCiclo: sql<number>`coalesce(max(ciclo_numero), 0)`,
    }).from(ciclosCuanticos);
    res.json({
      totalCiclos: Number(stats.totalCiclos),
      totalDelta: Number(stats.totalDelta),
      maxFactor: Number(stats.maxFactor),
      energiaTotal: Number(stats.energiaTotal),
      ultimoCiclo: Number(stats.ultimoCiclo),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── MOTOR DE EVOLUCIÓN CUÁNTICA INFINITA ────────────────────────────────────
router.post('/expansion-cuantica', async (req, res) => {
  try {
    const { ciclosAFirar = 1 } = req.body;
    const cantidad = Math.min(Number(ciclosAFirar), 5);

    const [statsActual] = await db.select({
      ultimoCiclo: sql<number>`coalesce(max(ciclo_numero), 0)`,
    }).from(ciclosCuanticos);

    const [banco] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
    let runningTotal = Number(banco?.totalEmitido ?? 1000);

    const ciclosCreados: any[] = [];

    for (let i = 0; i < cantidad; i++) {
      const numCiclo = Number(statsActual.ultimoCiclo) + i + 1;
      const dimIdx = (numCiclo - 1) % DIMENSIONES.length;
      const dim = DIMENSIONES[dimIdx];

      const exponente = (numCiclo / 10) * dim.energia;
      const factorCuantico = Math.pow(PHI, exponente);
      const energiaCuantica = dim.energia * Math.pow(PHI, numCiclo % 5);

      const fraccion = 0.0015 + (dim.energia * 0.0006);
      const valorExpansion = Math.max(500, runningTotal * fraccion);
      const valorRedondeado = Math.round(valorExpansion * 100) / 100;

      const nombreActivo = `CUANTO_${dim.nombre}_C${String(numCiclo).padStart(4, '0')}`;
      const totalAntes = runningTotal;

      await db.insert(activosReales).values({
        nombreActivo,
        valorTasaZircoin: String(valorRedondeado),
        estadoDisponibilidad: 'OPERATIVO',
        categoria: 'CUANTICO',
        descripcion: `${dim.simbolo} Ciclo #${numCiclo} · ${dim.nombre} · φ^${exponente.toFixed(3)}`,
      });

      const [bancoPost] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
      const nuevoTotal = Number(bancoPost?.totalEmitido ?? runningTotal);
      const deltaReal = Math.abs(nuevoTotal - totalAntes);
      runningTotal = nuevoTotal;

      const [ciclo] = await db.insert(ciclosCuanticos).values({
        cicloNumero: numCiclo,
        dimension: dim.nombre,
        factorAplicado: factorCuantico.toFixed(10),
        valorBase: valorRedondeado.toFixed(4),
        valorResultado: (valorRedondeado * factorCuantico).toFixed(4),
        delta: deltaReal.toFixed(4),
        energiaCuantica: energiaCuantica.toFixed(6),
        estado: 'COMPLETADO',
      }).returning();

      ciclosCreados.push({ ...ciclo, color: dim.color, simbolo: dim.simbolo });
    }

    const [bancoFinal] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
    res.json({ ciclosCreados, banco: bancoFinal, dimensiones: DIMENSIONES });
  } catch (e: any) {
    console.error('[CUANTICO]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
