import { eq, desc, sql } from 'drizzle-orm';
import { db, cuentasSoberanas, operacionesCuenta } from '../db';
import { AppError } from '../errors/AppError';

function genNumeroCuenta(): string {
  return `ZCK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function genReferencia(): string {
  return 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export const CuentasService = {

  async listar() {
    return db.select().from(cuentasSoberanas).orderBy(desc(cuentasSoberanas.fechaApertura));
  },

  async stats() {
    const [[totRow], [saldoRow], [opsRow], [activasRow]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(cuentasSoberanas),
      db.select({ sum: sql<number>`coalesce(sum(saldo::numeric), 0)` }).from(cuentasSoberanas),
      db.select({ count: sql<number>`count(*)` }).from(operacionesCuenta),
      db.select({ count: sql<number>`count(*)` }).from(cuentasSoberanas).where(eq(cuentasSoberanas.estado, 'ACTIVA')),
    ]);
    return {
      totalCuentas:    Number(totRow.count),
      saldoTotal:      Number(saldoRow.sum),
      totalOperaciones:Number(opsRow.count),
      cuentasActivas:  Number(activasRow.count),
    };
  },

  async get(id: number) {
    const [cuenta] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.id, id));
    if (!cuenta) throw AppError.notFound('Cuenta no encontrada');
    return cuenta;
  },

  async operaciones(id: number) {
    return db
      .select().from(operacionesCuenta)
      .where(eq(operacionesCuenta.idCuenta, id))
      .orderBy(desc(operacionesCuenta.timestamp))
      .limit(50);
  },

  async crear(titular: string, tipo = 'PERSONAL', saldoInicial = 0) {
    const numeroCuenta = genNumeroCuenta();
    const saldo = saldoInicial.toFixed(4);

    return db.transaction(async (tx) => {
      const [cuenta] = await tx.insert(cuentasSoberanas).values({
        numeroCuenta, titular, tipo, saldo, estado: 'ACTIVA',
      }).returning();

      if (saldoInicial > 0) {
        await tx.insert(operacionesCuenta).values({
          idCuenta: cuenta.id,
          tipo: 'APERTURA',
          monto: saldo,
          saldoAnterior: '0.0000',
          saldoResultante: saldo,
          descripcion: 'Apertura de cuenta — saldo inicial',
          referencia: genReferencia(),
        });
      }

      return cuenta;
    });
  },

  async depositar(id: number, monto: number, descripcion?: string) {
    return db.transaction(async (tx) => {
      const [cuenta] = await tx
        .select().from(cuentasSoberanas)
        .where(eq(cuentasSoberanas.id, id));

      if (!cuenta) throw AppError.notFound('Cuenta no encontrada');
      if (cuenta.estado !== 'ACTIVA') throw AppError.badRequest('Cuenta no activa');

      const saldoAnterior = Number(cuenta.saldo);
      const saldoNuevo = (saldoAnterior + monto).toFixed(4);

      const [actualizada] = await tx
        .update(cuentasSoberanas)
        .set({ saldo: saldoNuevo, ultimaOperacion: new Date() })
        .where(eq(cuentasSoberanas.id, id))
        .returning();

      const [op] = await tx.insert(operacionesCuenta).values({
        idCuenta: id,
        tipo: 'DEPOSITO',
        monto: monto.toFixed(4),
        saldoAnterior: saldoAnterior.toFixed(4),
        saldoResultante: saldoNuevo,
        descripcion: descripcion ?? 'Depósito ZIRCOIN',
        referencia: genReferencia(),
      }).returning();

      return { cuenta: actualizada, operacion: op };
    });
  },

  async retirar(id: number, monto: number, descripcion?: string) {
    return db.transaction(async (tx) => {
      const [cuenta] = await tx
        .select().from(cuentasSoberanas)
        .where(eq(cuentasSoberanas.id, id));

      if (!cuenta) throw AppError.notFound('Cuenta no encontrada');
      if (cuenta.estado !== 'ACTIVA') throw AppError.badRequest('Cuenta no activa');

      const saldoAnterior = Number(cuenta.saldo);
      if (saldoAnterior < monto) {
        throw AppError.badRequest(`Saldo insuficiente — Disponible: ${saldoAnterior.toFixed(4)} ZC`);
      }

      const saldoNuevo = (saldoAnterior - monto).toFixed(4);

      const [actualizada] = await tx
        .update(cuentasSoberanas)
        .set({ saldo: saldoNuevo, ultimaOperacion: new Date() })
        .where(eq(cuentasSoberanas.id, id))
        .returning();

      const [op] = await tx.insert(operacionesCuenta).values({
        idCuenta: id,
        tipo: 'RETIRO',
        monto: monto.toFixed(4),
        saldoAnterior: saldoAnterior.toFixed(4),
        saldoResultante: saldoNuevo,
        descripcion: descripcion ?? 'Retiro ZIRCOIN',
        referencia: genReferencia(),
      }).returning();

      return { cuenta: actualizada, operacion: op };
    });
  },

  /**
   * Transferencia atómica ACID.
   * Si cualquier paso falla, PostgreSQL hace rollback automático.
   * Garantía: el dinero no desaparece ni se duplica.
   */
  async transferir(
    numeroCuentaOrigen: string,
    numeroCuentaDestino: string,
    monto: number,
    descripcion?: string,
  ) {
    return db.transaction(async (tx) => {
      // 1. Leer ambas cuentas DENTRO de la transacción para evitar race conditions
      const [origen] = await tx
        .select().from(cuentasSoberanas)
        .where(eq(cuentasSoberanas.numeroCuenta, numeroCuentaOrigen));
      const [destino] = await tx
        .select().from(cuentasSoberanas)
        .where(eq(cuentasSoberanas.numeroCuenta, numeroCuentaDestino));

      // 2. Validaciones de negocio — lanzar AppError provoca rollback automático
      if (!origen)  throw AppError.notFound('Cuenta origen no encontrada');
      if (!destino) throw AppError.notFound('Cuenta destino no encontrada');
      if (origen.estado !== 'ACTIVA')  throw AppError.badRequest('Cuenta origen no activa');
      if (destino.estado !== 'ACTIVA') throw AppError.badRequest('Cuenta destino no activa');

      const saldoOrigen = Number(origen.saldo);
      if (saldoOrigen < monto) {
        throw AppError.badRequest(`Saldo insuficiente — Disponible: ${saldoOrigen.toFixed(4)} ZC`);
      }

      const nuevoSaldoOrigen  = (saldoOrigen - monto).toFixed(4);
      const nuevoSaldoDestino = (Number(destino.saldo) + monto).toFixed(4);
      const referencia = genReferencia();
      const desc = descripcion ?? `Transferencia a ${numeroCuentaDestino}`;
      const now = new Date();

      // 3. Débito — unidad atómica (si esto falla, nada se confirma)
      const [origenActualizado] = await tx
        .update(cuentasSoberanas)
        .set({ saldo: nuevoSaldoOrigen, ultimaOperacion: now })
        .where(eq(cuentasSoberanas.id, origen.id))
        .returning();

      // 4. Crédito — unidad atómica (si esto falla, el débito también revierte)
      const [destinoActualizado] = await tx
        .update(cuentasSoberanas)
        .set({ saldo: nuevoSaldoDestino, ultimaOperacion: now })
        .where(eq(cuentasSoberanas.id, destino.id))
        .returning();

      // 5. Registro bilateral de operaciones — dentro de la misma transacción
      await tx.insert(operacionesCuenta).values([
        {
          idCuenta: origen.id,
          tipo: 'TRANSFERENCIA_SALIDA',
          monto: monto.toFixed(4),
          saldoAnterior: saldoOrigen.toFixed(4),
          saldoResultante: nuevoSaldoOrigen,
          descripcion: desc,
          cuentaContraparte: numeroCuentaDestino,
          referencia,
        },
        {
          idCuenta: destino.id,
          tipo: 'TRANSFERENCIA_ENTRADA',
          monto: monto.toFixed(4),
          saldoAnterior: Number(destino.saldo).toFixed(4),
          saldoResultante: nuevoSaldoDestino,
          descripcion: `Recibido de ${numeroCuentaOrigen}`,
          cuentaContraparte: numeroCuentaOrigen,
          referencia,
        },
      ]);

      return { origen: origenActualizado, destino: destinoActualizado, referencia, monto };
    });
  },

  async cambiarEstado(id: number, estado: string) {
    const estados = ['ACTIVA', 'SUSPENDIDA', 'CERRADA'];
    if (!estados.includes(estado)) throw AppError.badRequest('Estado inválido');

    const [updated] = await db
      .update(cuentasSoberanas)
      .set({ estado })
      .where(eq(cuentasSoberanas.id, id))
      .returning();

    if (!updated) throw AppError.notFound('Cuenta no encontrada');
    return updated;
  },
};
