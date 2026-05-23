import { eq, desc, and, lt, sql } from 'drizzle-orm';
import { db, prestamosSoberanos, pagosPrestamo, cuentasSoberanas, operacionesCuenta, alertasSistema } from '../db';
import { AppError } from '../errors/AppError';

function genRef(): string {
  return 'PREST-' + Math.random().toString(36).substring(2, 9).toUpperCase();
}

export const PrestamosService = {

  async listar() {
    return db
      .select({
        id:                  prestamosSoberanos.id,
        montoPrincipal:      prestamosSoberanos.montoPrincipal,
        montoRestante:       prestamosSoberanos.montoRestante,
        tasaInteres:         prestamosSoberanos.tasaInteres,
        plazo:               prestamosSoberanos.plazo,
        estado:              prestamosSoberanos.estado,
        proposito:           prestamosSoberanos.proposito,
        totalPagado:         prestamosSoberanos.totalPagado,
        totalIntereses:      prestamosSoberanos.totalIntereses,
        fechaOtorgamiento:   prestamosSoberanos.fechaOtorgamiento,
        fechaVencimiento:    prestamosSoberanos.fechaVencimiento,
        idCuentaDeudor:      prestamosSoberanos.idCuentaDeudor,
        idCuentaAcreedor:    prestamosSoberanos.idCuentaAcreedor,
        titularDeudor:       cuentasSoberanas.titular,
        numeroCuentaDeudor:  cuentasSoberanas.numeroCuenta,
      })
      .from(prestamosSoberanos)
      .leftJoin(cuentasSoberanas, eq(prestamosSoberanos.idCuentaDeudor, cuentasSoberanas.id))
      .orderBy(desc(prestamosSoberanos.fechaOtorgamiento));
  },

  async stats() {
    const [[total], [activos], [pagados], [intereses], vencidos] = await Promise.all([
      db.select({ count: sql<number>`count(*)`, sum: sql<number>`coalesce(sum(monto_principal::numeric),0)` }).from(prestamosSoberanos),
      db.select({ count: sql<number>`count(*)`, restante: sql<number>`coalesce(sum(monto_restante::numeric),0)` }).from(prestamosSoberanos).where(eq(prestamosSoberanos.estado, 'ACTIVO')),
      db.select({ count: sql<number>`count(*)` }).from(prestamosSoberanos).where(eq(prestamosSoberanos.estado, 'PAGADO')),
      db.select({ sum: sql<number>`coalesce(sum(total_intereses::numeric),0)` }).from(prestamosSoberanos),
      db.select({ id: prestamosSoberanos.id }).from(prestamosSoberanos).where(and(eq(prestamosSoberanos.estado, 'ACTIVO'), lt(prestamosSoberanos.fechaVencimiento, new Date()))),
    ]);
    return {
      totalPrestamos:          Number(total.count),
      totalPrincipal:          Number(total.sum),
      prestamosActivos:        Number(activos.count),
      totalRestante:           Number(activos.restante),
      prestamosPagados:        Number(pagados.count),
      totalInteresesGenerados: Number(intereses.sum),
      prestamosVencidos:       vencidos.length,
    };
  },

  async pagos(id: number) {
    return db.select().from(pagosPrestamo)
      .where(eq(pagosPrestamo.idPrestamo, id))
      .orderBy(desc(pagosPrestamo.timestamp));
  },

  /**
   * Otorgar préstamo con operaciones ACID.
   * Si la inserción del préstamo falla, el saldo acreditado revierte.
   */
  async crear(idCuentaDeudor: number, montoPrincipal: number, plazo: number, proposito?: string) {
    return db.transaction(async (tx) => {
      const [deudor] = await tx
        .select().from(cuentasSoberanas)
        .where(eq(cuentasSoberanas.id, idCuentaDeudor));

      if (!deudor) throw AppError.notFound('Cuenta deudor no encontrada');
      if (deudor.estado !== 'ACTIVA') throw AppError.badRequest('Cuenta deudor no activa');

      const saldoAnterior = Number(deudor.saldo);
      const saldoNuevo    = (saldoAnterior + montoPrincipal).toFixed(4);
      const fechaVenc     = new Date();
      fechaVenc.setDate(fechaVenc.getDate() + plazo);

      // 1. Acreditar fondos en cuenta deudor
      await tx.update(cuentasSoberanas)
        .set({ saldo: saldoNuevo, ultimaOperacion: new Date() })
        .where(eq(cuentasSoberanas.id, idCuentaDeudor));

      // 2. Registrar operación de crédito
      await tx.insert(operacionesCuenta).values({
        idCuenta: idCuentaDeudor,
        tipo: 'PRESTAMO_RECIBIDO',
        monto: montoPrincipal.toFixed(4),
        saldoAnterior: saldoAnterior.toFixed(4),
        saldoResultante: saldoNuevo,
        descripcion: `Préstamo soberano otorgado — ${plazo} días`,
        referencia: genRef(),
      });

      // 3. Crear registro del préstamo
      const [prestamo] = await tx.insert(prestamosSoberanos).values({
        idCuentaDeudor,
        idCuentaAcreedor: null,
        montoPrincipal:   montoPrincipal.toFixed(4),
        montoRestante:    montoPrincipal.toFixed(4),
        tasaInteres:      '1.618',
        plazo,
        proposito:        proposito ?? 'Préstamo soberano',
        estado:           'ACTIVO',
        fechaVencimiento: fechaVenc,
      }).returning();

      // 4. Alerta informativa (fuera de la cadena crítica pero dentro de TX)
      await tx.insert(alertasSistema).values({
        tipo: 'PRESTAMO_OTORGADO',
        nivel: 'INFO',
        mensaje: `Préstamo de ${montoPrincipal.toLocaleString('es-ES')} ZC otorgado a ${deudor.titular} — vence en ${plazo} días`,
        entidadTipo: 'PRESTAMO',
        entidadId: prestamo.id,
      });

      return prestamo;
    });
  },

  /**
   * Pago atómico ACID.
   * Si el débito en cuenta pagadora tiene éxito pero falla el registro del pago,
   * PostgreSQL revierte todo y el saldo queda intacto.
   */
  async pagar(id: number, monto: number, idCuentaPagadora?: number) {
    return db.transaction(async (tx) => {
      const [prestamo] = await tx
        .select().from(prestamosSoberanos)
        .where(eq(prestamosSoberanos.id, id));

      if (!prestamo) throw AppError.notFound('Préstamo no encontrado');
      if (prestamo.estado === 'PAGADO') throw AppError.conflict('Préstamo ya liquidado');

      const tasa          = Number(prestamo.tasaInteres);
      const interesPago   = Number((monto * (tasa - 1)).toFixed(4));
      const capitalPago   = Number((monto - interesPago).toFixed(4));
      const nuevoRestante = Math.max(0, Number(prestamo.montoRestante) - capitalPago).toFixed(4);

      // 1. Débito en cuenta pagadora (si aplica)
      if (idCuentaPagadora) {
        const [pagoCuenta] = await tx
          .select().from(cuentasSoberanas)
          .where(eq(cuentasSoberanas.id, idCuentaPagadora));

        if (!pagoCuenta) throw AppError.notFound('Cuenta pagadora no encontrada');
        if (Number(pagoCuenta.saldo) < monto) {
          throw AppError.badRequest('Saldo insuficiente en cuenta pagadora');
        }

        const nuevoSaldo = (Number(pagoCuenta.saldo) - monto).toFixed(4);

        await tx.update(cuentasSoberanas)
          .set({ saldo: nuevoSaldo, ultimaOperacion: new Date() })
          .where(eq(cuentasSoberanas.id, idCuentaPagadora));

        await tx.insert(operacionesCuenta).values({
          idCuenta: idCuentaPagadora,
          tipo: 'PAGO_PRESTAMO',
          monto: monto.toFixed(4),
          saldoAnterior: pagoCuenta.saldo,
          saldoResultante: nuevoSaldo,
          descripcion: `Pago a préstamo #${id}`,
          referencia: genRef(),
        });
      }

      // 2. Actualizar estado del préstamo
      const nuevoEstado       = Number(nuevoRestante) === 0 ? 'PAGADO' : prestamo.estado;
      const nuevoTotalPagado  = (Number(prestamo.totalPagado) + monto).toFixed(4);
      const nuevoIntereses    = (Number(prestamo.totalIntereses) + interesPago).toFixed(4);

      await tx.update(prestamosSoberanos)
        .set({ montoRestante: nuevoRestante, totalPagado: nuevoTotalPagado, totalIntereses: nuevoIntereses, estado: nuevoEstado })
        .where(eq(prestamosSoberanos.id, id));

      // 3. Registro de pago
      const [pago] = await tx.insert(pagosPrestamo).values({
        idPrestamo:    id,
        monto:         monto.toFixed(4),
        montoCapital:  capitalPago.toFixed(4),
        montoInteres:  interesPago.toFixed(4),
        saldoRestante: nuevoRestante,
        concepto:      `Pago #${id} — capital ${capitalPago.toFixed(2)} + interés ${interesPago.toFixed(2)} ZC`,
      }).returning();

      // 4. Alerta si el préstamo queda liquidado
      if (nuevoEstado === 'PAGADO') {
        await tx.insert(alertasSistema).values({
          tipo: 'PRESTAMO_PAGADO',
          nivel: 'INFO',
          mensaje: `Préstamo #${id} liquidado completamente`,
          entidadTipo: 'PRESTAMO',
          entidadId: id,
        });
      }

      return { pago, prestamoActualizado: { ...prestamo, montoRestante: nuevoRestante, estado: nuevoEstado } };
    });
  },
};
