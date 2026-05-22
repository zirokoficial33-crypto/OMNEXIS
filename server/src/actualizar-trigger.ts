import { Pool } from 'pg';

async function actualizarTrigger() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  console.log('[ZIRCOIN] Actualizando función de auto-evolución con historial...');

  await pool.query(`
    CREATE OR REPLACE FUNCTION procesar_evolucion_infinita()
    RETURNS TRIGGER AS $$
    DECLARE
      v_delta   DECIMAL(20,4);
      v_total   DECIMAL(25,4);
    BEGIN
      v_delta := NEW.valor_tasa_zircoin * 1.618;

      UPDATE banco_central_zirok
      SET total_emitido        = total_emitido + v_delta,
          transacciones_totales = transacciones_totales + 1,
          ultima_actualizacion  = CURRENT_TIMESTAMP
      WHERE id_banco = 1
      RETURNING total_emitido INTO v_total;

      INSERT INTO historial_expansion
        (nombre_activo, valor_activo, delta_emitido, total_acumulado, timestamp)
      VALUES
        (NEW.nombre_activo, NEW.valor_tasa_zircoin, v_delta, v_total, CURRENT_TIMESTAMP);

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log('[ZIRCOIN] Función actualizada. Trigger sigue activo en activos_reales.');
  await pool.end();
  process.exit(0);
}

actualizarTrigger().catch(e => { console.error('[ZIRCOIN] ERROR:', e); process.exit(1); });
