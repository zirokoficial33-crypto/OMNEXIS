import { Router } from 'express';
import { db, prestamosSoberanos, pagosPrestamo, cuentasSoberanas, operacionesCuenta, alertasSistema } from '../db';
import { eq, desc, and, lt, sql } from 'drizzle-orm';

const router = Router();

function ref() { return 'PREST-' + Math.random().toString(36).substring(2, 9).toUpperCase(); }

// GET /api/prestamos
router.get('/', async (_req, res) => {
  try {
    const prestamos = await db
      .select({
        id: prestamosSoberanos.id,
        montoPrincipal: prestamosSoberanos.montoPrincipal,
        montoRestante: prestamosSoberanos.montoRestante,
        tasaInteres: prestamosSoberanos.tasaInteres,
        plazo: prestamosSoberanos.plazo,
        estado: prestamosSoberanos.estado,
        proposito: prestamosSoberanos.proposito,
        totalPagado: prestamosSoberanos.totalPagado,
        totalIntereses: prestamosSoberanos.totalIntereses,
        fechaOtorgamiento: prestamosSoberanos.fechaOtorgamiento,
        fechaVencimiento: prestamosSoberanos.fechaVencimiento,
        idCuentaDeudor: prestamosSoberanos.idCuentaDeudor,
        idCuentaAcreedor: prestamosSoberanos.idCuentaAcreedor,
        titularDeudor: cuentasSoberanas.titular,
        numeroCuentaDeudor: cuentasSoberanas.numeroCuenta,
      })
      .from(prestamosSoberanos)
      .leftJoin(cuentasSoberanas, eq(prestamosSoberanos.idCuentaDeudor, cuentasSoberanas.id))
      .orderBy(desc(prestamosSoberanos.fechaOtorgamiento));
    res.json(prestamos);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/prestamos/stats
router.get('/stats', async (_req, res) => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)`, sum: sql<number>`coalesce(sum(monto_principal),0)` }).from(prestamosSoberanos);
    const [activos] = await db.select({ count: sql<number>`count(*)`, restante: sql<number>`coalesce(sum(monto_restante),0)` }).from(prestamosSoberanos).where(eq(prestamosSoberanos.estado, 'ACTIVO'));
    const [pagados] = await db.select({ count: sql<number>`count(*)` }).from(prestamosSoberanos).where(eq(prestamosSoberanos.estado, 'PAGADO'));
    const [intereses] = await db.select({ sum: sql<number>`coalesce(sum(total_intereses),0)` }).from(prestamosSoberanos);
    const vencidos = await db.select({ id: prestamosSoberanos.id }).from(prestamosSoberanos)
      .where(and(eq(prestamosSoberanos.estado, 'ACTIVO'), lt(prestamosSoberanos.fechaVencimiento, new Date())));
    res.json({
      totalPrestamos: Number(total.count),
      totalPrincipal: Number(total.sum),
      prestamosActivos: Number(activos.count),
      totalRestante: Number(activos.restante),
      prestamosPagados: Number(pagados.count),
      totalInteresesGenerados: Number(intereses.sum),
      prestamosVencidos: vencidos.length,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/prestamos/:id/pagos
router.get('/:id/pagos', async (req, res) => {
  try {
    const pagos = await db.select().from(pagosPrestamo)
      .where(eq(pagosPrestamo.idPrestamo, Number(req.params.id)))
      .orderBy(desc(pagosPrestamo.timestamp));
    res.json(pagos);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/prestamos — otorgar préstamo
router.post('/', async (req, res) => {
  try {
    const { idCuentaDeudor, idCuentaAcreedor, montoPrincipal, plazo, proposito } = req.body;
    if (!idCuentaDeudor || !montoPrincipal || !plazo) return res.status(400).json({ error: 'Campos requeridos: idCuentaDeudor, montoPrincipal, plazo' });

    const montoNum = Number(montoPrincipal);
    const [deudor] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.id, Number(idCuentaDeudor)));
    if (!deudor) return res.status(404).json({ error: 'Cuenta deudor no encontrada' });
    if (deudor.estado !== 'ACTIVA') return res.status(400).json({ error: 'Cuenta deudor no activa' });

    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + Number(plazo));

    // Acreditar fondos en cuenta deudor
    const saldoAnterior = Number(deudor.saldo);
    const saldoNuevo = (saldoAnterior + montoNum).toFixed(4);
    await db.update(cuentasSoberanas).set({ saldo: saldoNuevo, ultimaOperacion: new Date() }).where(eq(cuentasSoberanas.id, deudor.id));

    await db.insert(operacionesCuenta).values({
      idCuenta: deudor.id,
      tipo: 'PRESTAMO_RECIBIDO',
      monto: montoNum.toFixed(4),
      saldoAnterior: saldoAnterior.toFixed(4),
      saldoResultante: saldoNuevo,
      descripcion: `Préstamo soberano otorgado — ${plazo} días`,
      referencia: ref(),
    });

    const [prestamo] = await db.insert(prestamosSoberanos).values({
      idCuentaDeudor: Number(idCuentaDeudor),
      idCuentaAcreedor: idCuentaAcreedor ? Number(idCuentaAcreedor) : null,
      montoPrincipal: montoNum.toFixed(4),
      montoRestante: montoNum.toFixed(4),
      tasaInteres: '1.618',
      plazo: Number(plazo),
      proposito: proposito || 'Préstamo soberano',
      estado: 'ACTIVO',
      fechaVencimiento,
    }).returning();

    // Alerta de nuevo préstamo
    await db.insert(alertasSistema).values({
      tipo: 'PRESTAMO_OTORGADO',
      nivel: 'INFO',
      mensaje: `Préstamo de ${montoNum.toLocaleString()} ZC otorgado a ${deudor.titular} — vence en ${plazo} días`,
      entidadTipo: 'PRESTAMO',
      entidadId: prestamo.id,
    });

    res.status(201).json(prestamo);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/prestamos/:id/pagar — registrar pago
router.post('/:id/pagar', async (req, res) => {
  try {
    const { monto, idCuentaPagadora } = req.body;
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) return res.status(400).json({ error: 'Monto inválido' });

    const [prestamo] = await db.select().from(prestamosSoberanos).where(eq(prestamosSoberanos.id, Number(req.params.id)));
    if (!prestamo) return res.status(404).json({ error: 'Préstamo no encontrado' });
    if (prestamo.estado === 'PAGADO') return res.status(400).json({ error: 'Préstamo ya pagado' });

    // Calcular interés φ proporcional al pago
    const tasa = Number(prestamo.tasaInteres);
    const interesPago = Number((montoNum * (tasa - 1)).toFixed(4));
    const capitalPago = Number((montoNum - interesPago).toFixed(4));
    const restanteActual = Number(prestamo.montoRestante);
    const nuevoRestante = Math.max(0, restanteActual - capitalPago).toFixed(4);

    const [pagoCuenta] = idCuentaPagadora
      ? await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.id, Number(idCuentaPagadora)))
      : [null];

    if (pagoCuenta) {
      if (Number(pagoCuenta.saldo) < montoNum) return res.status(400).json({ error: 'Saldo insuficiente en cuenta pagadora' });
      const nuevoSaldo = (Number(pagoCuenta.saldo) - montoNum).toFixed(4);
      await db.update(cuentasSoberanas).set({ saldo: nuevoSaldo, ultimaOperacion: new Date() }).where(eq(cuentasSoberanas.id, pagoCuenta.id));
      await db.insert(operacionesCuenta).values({
        idCuenta: pagoCuenta.id,
        tipo: 'PAGO_PRESTAMO',
        monto: montoNum.toFixed(4),
        saldoAnterior: Number(pagoCuenta.saldo).toFixed(4),
        saldoResultante: nuevoSaldo,
        descripcion: `Pago a préstamo #${prestamo.id}`,
        referencia: ref(),
      });
    }

    const nuevoTotalPagado = (Number(prestamo.totalPagado) + montoNum).toFixed(4);
    const nuevoTotalIntereses = (Number(prestamo.totalIntereses) + interesPago).toFixed(4);
    const nuevoEstado = Number(nuevoRestante) === 0 ? 'PAGADO' : prestamo.estado;

    await db.update(prestamosSoberanos)
      .set({ montoRestante: nuevoRestante, totalPagado: nuevoTotalPagado, totalIntereses: nuevoTotalIntereses, estado: nuevoEstado })
      .where(eq(prestamosSoberanos.id, prestamo.id));

    const [pago] = await db.insert(pagosPrestamo).values({
      idPrestamo: prestamo.id,
      monto: montoNum.toFixed(4),
      montoCapital: capitalPago.toFixed(4),
      montoInteres: interesPago.toFixed(4),
      saldoRestante: nuevoRestante,
      concepto: `Pago #${prestamo.id} — capital ${capitalPago.toFixed(2)} + interés ${interesPago.toFixed(2)} ZC`,
    }).returning();

    if (nuevoEstado === 'PAGADO') {
      await db.insert(alertasSistema).values({
        tipo: 'PRESTAMO_PAGADO',
        nivel: 'INFO',
        mensaje: `Préstamo #${prestamo.id} liquidado completamente`,
        entidadTipo: 'PRESTAMO',
        entidadId: prestamo.id,
      });
    }

    res.json({ pago, prestamoActualizado: { ...prestamo, montoRestante: nuevoRestante, estado: nuevoEstado } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
