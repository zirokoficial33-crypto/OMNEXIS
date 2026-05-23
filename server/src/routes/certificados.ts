import { Router } from 'express';
import { db, certificadosValor, movimientosCertificado, cuentasSoberanas, activosReales, alertasSistema, operacionesCuenta } from '../db';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

function genSerial(): string {
  const ts = Date.now().toString(36).toUpperCase().padStart(8, '0').slice(-8);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const check = (Math.floor(Math.random() * 9000) + 1000).toString();
  return `ZCV-${ts}${rand}-${check}`;
}

// GET /api/certificados
router.get('/', async (_req, res) => {
  try {
    const certs = await db
      .select({
        id: certificadosValor.id,
        serialCertificado: certificadosValor.serialCertificado,
        denominacion: certificadosValor.denominacion,
        estado: certificadosValor.estado,
        clase: certificadosValor.clase,
        descripcion: certificadosValor.descripcion,
        fechaEmision: certificadosValor.fechaEmision,
        fechaVencimiento: certificadosValor.fechaVencimiento,
        fechaRedencion: certificadosValor.fechaRedencion,
        idActivoRespaldo: certificadosValor.idActivoRespaldo,
        idCuentaTenedor: certificadosValor.idCuentaTenedor,
        nombreActivo: activosReales.nombreActivo,
        titularCuenta: cuentasSoberanas.titular,
        numeroCuenta: cuentasSoberanas.numeroCuenta,
      })
      .from(certificadosValor)
      .leftJoin(activosReales, eq(certificadosValor.idActivoRespaldo, activosReales.id))
      .leftJoin(cuentasSoberanas, eq(certificadosValor.idCuentaTenedor, cuentasSoberanas.id))
      .orderBy(desc(certificadosValor.fechaEmision));
    res.json(certs);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/certificados/stats
router.get('/stats', async (_req, res) => {
  try {
    const [all] = await db.select({
      total: sql<number>`count(*)`,
      valorTotal: sql<number>`coalesce(sum(denominacion::numeric), 0)`,
      activos: sql<number>`count(*) filter (where estado = 'ACTIVO')`,
      redimidos: sql<number>`count(*) filter (where estado = 'REDIMIDO')`,
      transferidos: sql<number>`count(*) filter (where estado = 'TRANSFERIDO')`,
      valorActivo: sql<number>`coalesce(sum(case when estado = 'ACTIVO' then denominacion::numeric else 0 end), 0)`,
    }).from(certificadosValor);
    res.json({
      total: Number(all.total),
      valorTotal: Number(all.valorTotal),
      activos: Number(all.activos),
      redimidos: Number(all.redimidos),
      transferidos: Number(all.transferidos),
      valorActivo: Number(all.valorActivo),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/certificados/:id/movimientos
router.get('/:id/movimientos', async (req, res) => {
  try {
    const movs = await db
      .select({
        id: movimientosCertificado.id,
        tipo: movimientosCertificado.tipo,
        notas: movimientosCertificado.notas,
        timestamp: movimientosCertificado.timestamp,
        idCuentaOrigen: movimientosCertificado.idCuentaOrigen,
        idCuentaDestino: movimientosCertificado.idCuentaDestino,
      })
      .from(movimientosCertificado)
      .where(eq(movimientosCertificado.idCertificado, Number(req.params.id)))
      .orderBy(desc(movimientosCertificado.timestamp));
    res.json(movs);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/certificados — emitir certificado
router.post('/', async (req, res) => {
  try {
    const { denominacion, idActivoRespaldo, idCuentaTenedor, clase, descripcion, diasVigencia } = req.body;
    if (!denominacion) return res.status(400).json({ error: 'Denominación requerida' });

    const serial = genSerial();
    const fechaVencimiento = diasVigencia ? new Date(Date.now() + Number(diasVigencia) * 86400000) : null;

    const [cert] = await db.insert(certificadosValor).values({
      serialCertificado: serial,
      denominacion: Number(denominacion).toFixed(4),
      idActivoRespaldo: idActivoRespaldo ? Number(idActivoRespaldo) : null,
      idCuentaTenedor: idCuentaTenedor ? Number(idCuentaTenedor) : null,
      estado: 'ACTIVO',
      clase: clase || 'SOBERANO',
      descripcion: descripcion || null,
      fechaVencimiento,
    }).returning();

    await db.insert(movimientosCertificado).values({
      idCertificado: cert.id,
      tipo: 'EMISION',
      idCuentaDestino: idCuentaTenedor ? Number(idCuentaTenedor) : null,
      notas: `Certificado ${serial} emitido — ${Number(denominacion).toFixed(2)} ZC`,
    });

    await db.insert(alertasSistema).values({
      tipo: 'CERTIFICADO_EMITIDO',
      nivel: 'INFO',
      mensaje: `Certificado ${serial} emitido — ${Number(denominacion).toFixed(2)} ZC · clase ${clase || 'SOBERANO'}`,
      entidadTipo: 'CERTIFICADO',
      entidadId: cert.id,
    });

    res.status(201).json(cert);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/certificados/:id/transferir
router.post('/:id/transferir', async (req, res) => {
  try {
    const { idCuentaDestino, notas } = req.body;
    if (!idCuentaDestino) return res.status(400).json({ error: 'Cuenta destino requerida' });

    const [cert] = await db.select().from(certificadosValor).where(eq(certificadosValor.id, Number(req.params.id)));
    if (!cert) return res.status(404).json({ error: 'Certificado no encontrado' });
    if (cert.estado !== 'ACTIVO') return res.status(400).json({ error: 'Solo se pueden transferir certificados ACTIVOS' });

    const [destino] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.id, Number(idCuentaDestino)));
    if (!destino) return res.status(404).json({ error: 'Cuenta destino no encontrada' });

    await db.update(certificadosValor).set({
      idCuentaTenedor: Number(idCuentaDestino),
      estado: 'TRANSFERIDO',
    }).where(eq(certificadosValor.id, cert.id));

    await db.insert(movimientosCertificado).values({
      idCertificado: cert.id,
      tipo: 'TRANSFERENCIA',
      idCuentaOrigen: cert.idCuentaTenedor,
      idCuentaDestino: Number(idCuentaDestino),
      notas: notas || `Transferido a ${destino.titular}`,
    });

    // Nuevo certificado activo para el nuevo tenedor (estado ACTIVO)
    await db.update(certificadosValor).set({ estado: 'ACTIVO' }).where(eq(certificadosValor.id, cert.id));

    res.json({ success: true, nuevoTenedor: destino.titular });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/certificados/:id/redimir
router.post('/:id/redimir', async (req, res) => {
  try {
    const { idCuentaCobro, notas } = req.body;
    const [cert] = await db.select().from(certificadosValor).where(eq(certificadosValor.id, Number(req.params.id)));
    if (!cert) return res.status(404).json({ error: 'Certificado no encontrado' });
    if (cert.estado === 'REDIMIDO') return res.status(400).json({ error: 'Certificado ya redimido' });

    // Acreditar denominación en cuenta si se especifica
    if (idCuentaCobro) {
      const [cuenta] = await db.select().from(cuentasSoberanas).where(eq(cuentasSoberanas.id, Number(idCuentaCobro)));
      if (cuenta) {
        const nuevo = (Number(cuenta.saldo) + Number(cert.denominacion)).toFixed(4);
        await db.update(cuentasSoberanas).set({ saldo: nuevo, ultimaOperacion: new Date() }).where(eq(cuentasSoberanas.id, cuenta.id));
        await db.insert(operacionesCuenta).values({
          idCuenta: cuenta.id,
          tipo: 'REDENCION_CERTIFICADO',
          monto: cert.denominacion,
          saldoAnterior: cuenta.saldo,
          saldoResultante: nuevo,
          descripcion: `Redención de certificado ${cert.serialCertificado}`,
          referencia: cert.serialCertificado,
        });
      }
    }

    await db.update(certificadosValor).set({
      estado: 'REDIMIDO',
      fechaRedencion: new Date(),
    }).where(eq(certificadosValor.id, cert.id));

    await db.insert(movimientosCertificado).values({
      idCertificado: cert.id,
      tipo: 'REDENCION',
      idCuentaDestino: idCuentaCobro ? Number(idCuentaCobro) : null,
      notas: notas || 'Redención soberana',
    });

    await db.insert(alertasSistema).values({
      tipo: 'CERTIFICADO_REDIMIDO',
      nivel: 'INFO',
      mensaje: `Certificado ${cert.serialCertificado} redimido — ${Number(cert.denominacion).toFixed(2)} ZC`,
      entidadTipo: 'CERTIFICADO',
      entidadId: cert.id,
    });

    res.json({ success: true, denominacion: cert.denominacion });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
