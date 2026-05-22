import { db, activosReales, libroMayorZircoin, controlSoberano, bancoCentralZirok } from './db';
import { eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';

async function materializarMAIM() {
  console.log('[ZIRCOIN] Iniciando Materialización MAIM...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // 1. Crear la función PL/pgSQL de auto-evolución
  await pool.query(`
    CREATE OR REPLACE FUNCTION procesar_evolucion_infinita()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE banco_central_zirok
      SET total_emitido = total_emitido + (NEW.valor_tasa_zircoin * factor_crecimiento),
          transacciones_totales = transacciones_totales + 1,
          ultima_actualizacion = CURRENT_TIMESTAMP
      WHERE id_banco = 1;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log('[ZIRCOIN] Función procesar_evolucion_infinita creada.');

  // 2. Crear el trigger (drop previo para idempotencia)
  await pool.query(`
    DROP TRIGGER IF EXISTS gatillo_expansion_infinita ON activos_reales;
  `);
  await pool.query(`
    CREATE TRIGGER gatillo_expansion_infinita
    AFTER INSERT ON activos_reales
    FOR EACH ROW
    EXECUTE FUNCTION procesar_evolucion_infinita();
  `);
  console.log('[ZIRCOIN] Trigger gatillo_expansion_infinita activado.');

  // 3. Inicializar banco central si no existe
  const [bancoExistente] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
  if (!bancoExistente) {
    await db.insert(bancoCentralZirok).values({
      idBanco: 1,
      nombreBanco: 'Banco de Soberanía Absoluta',
      totalEmitido: '0.0000',
      factorCrecimiento: '1.618',
      transaccionesTotales: 0,
    });
    console.log('[ZIRCOIN] Banco Central Zirok inicializado.');
  } else {
    console.log('[ZIRCOIN] Banco Central ya existente — omitiendo inicialización.');
  }

  // 4. Insertar activo FLUJO_MAIM_TOTAL (el trigger actualizará el banco automáticamente)
  const [activoMAIM] = await db.insert(activosReales).values({
    nombreActivo: 'FLUJO_MAIM_TOTAL',
    valorTasaZircoin: '50000.00',
    estadoDisponibilidad: 'OPERATIVO',
    categoria: 'SOBERANIA',
    descripcion: 'Flujo MAIM — Nivel de Soberanía Operativa. Valor: 50,000 ZC',
  }).returning();
  console.log(`[ZIRCOIN] Activo FLUJO_MAIM_TOTAL materializado. ID: ${activoMAIM.id}`);

  // 5. Registrar en libro mayor
  await db.insert(libroMayorZircoin).values({
    montoEmitido: '50000.00',
    idActivoRespaldo: activoMAIM.id,
    serialBillete: 'MAIM-ZC-001',
    origen: 'BANCO_CENTRAL_ZIROK',
    destino: 'CIRCULACION_SOBERANA',
    tipoOperacion: 'EMISION',
    estatusEjecucion: 'MANIFESTADO',
  });
  console.log('[ZIRCOIN] Emisión registrada en Libro Mayor Zircoin.');

  // 6. Registrar comando de vigilancia en control soberano
  await db.insert(controlSoberano).values({
    comandoEjecutado: 'MONITOREO_FLUJO_MAIM',
    nivelPrioridad: 10,
    ejecucionFinalizada: false,
    resultado: null,
    operador: 'SISTEMA_CENTRAL',
  });
  console.log('[ZIRCOIN] Comando MONITOREO_FLUJO_MAIM registrado en Control Soberano.');

  // Estado final del banco
  const [bancofinal] = await db.select().from(bancoCentralZirok).where(eq(bancoCentralZirok.idBanco, 1));
  console.log('\n[ZIRCOIN] ====== ESTADO BANCO CENTRAL ZIROK ======');
  console.log(`  Total Emitido : ${bancofinal.totalEmitido} ZC`);
  console.log(`  Transacciones : ${bancofinal.transaccionesTotales}`);
  console.log(`  Actualizado   : ${bancofinal.ultimaActualizacion}`);
  console.log('[ZIRCOIN] Materialización MAIM completada. Sistema OPERATIVO.');

  await pool.end();
  process.exit(0);
}

materializarMAIM().catch(e => { console.error('[ZIRCOIN] ERROR:', e); process.exit(1); });
