import { eq, desc, sql } from 'drizzle-orm';
import { db, certificadosValor, movimientosCertificado, cuentasSoberanas, activosReales, alertasSistema, operacionesCuenta } from '../db';
import { AppError } from '../errors/AppError';

function genSerial(): string {
  const ts   = Date.now().toString(36).toUpperCase().padStart(8, '0').slice(-8);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const check = (Math.floor(Math.random() * 9000) + 1000).toString();
  return `ZCV-${ts}${rand}-${check}`;
}

export const CertificadosService = {

  async listar() {
    return db
      .select({
        id:                 certificadosValor.id,
        serialCertificado:  certificadosValor.serialCertificado,
        denominacion:       certificadosValor.denominacion,
        estado:             certificadosValor.estado,
        clase:              certificadosValor.clase,
        descripcion:        certificadosValor.descripcion,
        fechaEmision:       certificadosValor.fechaEmision,
        fechaVencimiento:   certificadosValor.fechaVencimiento,
        fechaRedencion:     certificadosValor.fechaRedencion,
        idActivoRespaldo:   certificadosValor.idActivoRespaldo,
        idCuentaTenedor:    certificadosValor.idCuentaTenedor,
        nombreActivo:       activosReales.nombreActivo,
        titularCuenta:      cuentasSoberanas.titular,
        numeroCuenta:       cuentasSoberanas.numeroCuenta,
      })
      .from(certificadosValor)
      .leftJoin(activosReales, eq(certificadosValor.idActivoRespaldo, activosReales.id))
      .leftJoin(cuentasSoberanas, eq(certificadosValor.idCuentaTenedor, cuentasSoberanas.id))
      .orderBy(desc(certificadosValor.fechaEmision));
  },

  async stats() {
    const [all] = await db.select({
      total:       sql<number>`count(*)`,
      valorTotal:  sql<number>`coalesce(sum(denominacion::numeric), 0)`,
      activos:     sql<number>`count(*) filter (where estado = 'ACTIVO')`,
      redimidos:   sql<number>`count(*) filter (where estado = 'REDIMIDO')`,
      transferidos:sql<number>`count(*) filter (where estado = 'TRANSFERIDO')`,
      valorActivo: sql<number>`coalesce(sum(case when estado = 'ACTIVO' then denominacion::numeric else 0 end), 0)`,
    }).from(certificadosValor);

    return {
      total:        Number(all.total),
      valorTotal:   Number(all.valorTotal),
      activos:      Number(all.activos),
      redimidos:    Number(all.redimidos),
      transferidos: Number(all.transferidos),
      valorActivo:  Number(all.valorActivo),
    };
  },

  async movimientos(id: number) {
    return db.select({
      id:             movimientosCertificado.id,
      tipo:           movimientosCertificado.tipo,
      notas:          movimientosCertificado.notas,
      timestamp:      movimientosCertificado.timestamp,
      idCuentaOrigen: movimientosCertificado.idCuentaOrigen,
      idCuentaDestino:movimientosCertificado.idCuentaDestino,
    })
    .from(movimientosCertificado)
    .where(eq(movimientosCertificado.idCertificado, id))
    .orderBy(desc(movimientosCertificado.timestamp));
  },

  /**
   * Emisión ACID: certificado + movimiento + alerta en una sola transacción.
   */
  async emitir(
    denominacion:    number,
    clase:           string,
    descripcion?:    string,
    diasVigencia?:   number,
    idActivoRespaldo?: number,
    idCuentaTenedor?:  number,
  ) {
    return db.transaction(async (tx) => {
      const serial          = genSerial();
      const fechaVencimiento = diasVigencia
        ? new Date(Date.now() + diasVigencia * 86_400_000)
        : null;

      const [cert] = await tx.insert(certificadosValor).values({
        serialCertificado: serial,
        denominacion:      denominacion.toFixed(4),
        idActivoRespaldo:  idActivoRespaldo ?? null,
        idCuentaTenedor:   idCuentaTenedor  ?? null,
        estado:            'ACTIVO',
        clase,
        descripcion:       descripcion ?? null,
        fechaVencimiento,
      }).returning();

      await tx.insert(movimientosCertificado).values({
        idCertificado:  cert.id,
        tipo:           'EMISION',
        idCuentaDestino: idCuentaTenedor ?? null,
        notas:          `Certificado ${serial} emitido — ${denominacion.toFixed(2)} ZC`,
      });

      await tx.insert(alertasSistema).values({
        tipo:        'CERTIFICADO_EMITIDO',
        nivel:       'INFO',
        mensaje:     `Certificado ${serial} emitido — ${denominacion.toFixed(2)} ZC · clase ${clase}`,
        entidadTipo: 'CERTIFICADO',
        entidadId:   cert.id,
      });

      return cert;
    });
  },

  /**
   * Transferencia ACID: actualizar tenedor + registrar movimiento en una TX.
   */
  async transferir(id: number, idCuentaDestino: number, notas?: string) {
    return db.transaction(async (tx) => {
      const [cert] = await tx
        .select().from(certificadosValor)
        .where(eq(certificadosValor.id, id));

      if (!cert) throw AppError.notFound('Certificado no encontrado');
      if (cert.estado !== 'ACTIVO') throw AppError.badRequest('Solo se pueden transferir certificados ACTIVOS');

      const [destino] = await tx
        .select().from(cuentasSoberanas)
        .where(eq(cuentasSoberanas.id, idCuentaDestino));

      if (!destino) throw AppError.notFound('Cuenta destino no encontrada');

      await tx.update(certificadosValor)
        .set({ idCuentaTenedor: idCuentaDestino, estado: 'ACTIVO' })
        .where(eq(certificadosValor.id, id));

      await tx.insert(movimientosCertificado).values({
        idCertificado:  id,
        tipo:           'TRANSFERENCIA',
        idCuentaOrigen: cert.idCuentaTenedor,
        idCuentaDestino,
        notas:          notas ?? `Transferido a ${destino.titular}`,
      });

      return { success: true, nuevoTenedor: destino.titular };
    });
  },

  /**
   * Redención ACID: acreditar ZC en cuenta + marcar certificado REDIMIDO en una TX.
   * Si el acreditar falla, el certificado no se marca como redimido. Nunca se pierde dinero.
   */
  async redimir(id: number, idCuentaCobro?: number, notas?: string) {
    return db.transaction(async (tx) => {
      const [cert] = await tx
        .select().from(certificadosValor)
        .where(eq(certificadosValor.id, id));

      if (!cert) throw AppError.notFound('Certificado no encontrado');
      if (cert.estado === 'REDIMIDO') throw AppError.conflict('Certificado ya redimido');

      const denominacion = Number(cert.denominacion);

      // 1. Acreditar ZC en cuenta (si se especifica)
      if (idCuentaCobro) {
        const [cuenta] = await tx
          .select().from(cuentasSoberanas)
          .where(eq(cuentasSoberanas.id, idCuentaCobro));

        if (!cuenta) throw AppError.notFound('Cuenta de cobro no encontrada');

        const saldoNuevo = (Number(cuenta.saldo) + denominacion).toFixed(4);

        await tx.update(cuentasSoberanas)
          .set({ saldo: saldoNuevo, ultimaOperacion: new Date() })
          .where(eq(cuentasSoberanas.id, idCuentaCobro));

        await tx.insert(operacionesCuenta).values({
          idCuenta:        idCuentaCobro,
          tipo:            'REDENCION_CERTIFICADO',
          monto:           cert.denominacion,
          saldoAnterior:   cuenta.saldo,
          saldoResultante: saldoNuevo,
          descripcion:     `Redención de certificado ${cert.serialCertificado}`,
          referencia:      cert.serialCertificado,
        });
      }

      // 2. Marcar como REDIMIDO
      await tx.update(certificadosValor)
        .set({ estado: 'REDIMIDO', fechaRedencion: new Date() })
        .where(eq(certificadosValor.id, id));

      // 3. Movimiento de redención
      await tx.insert(movimientosCertificado).values({
        idCertificado:  id,
        tipo:           'REDENCION',
        idCuentaDestino: idCuentaCobro ?? null,
        notas:          notas ?? 'Redención soberana',
      });

      // 4. Alerta
      await tx.insert(alertasSistema).values({
        tipo:        'CERTIFICADO_REDIMIDO',
        nivel:       'INFO',
        mensaje:     `Certificado ${cert.serialCertificado} redimido — ${denominacion.toFixed(2)} ZC`,
        entidadTipo: 'CERTIFICADO',
        entidadId:   id,
      });

      return { success: true, denominacion: cert.denominacion };
    });
  },
};
