import { db, cuentasSoberanas, operacionesCuenta } from './db';

function genNum(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ZCK-${ts}-${rand}`;
}

function ref(): string {
  return 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function seedCuentas() {
  console.log('[ZIRCOIN] Abriendo cuentas fundacionales...');

  const cuentasData = [
    { titular: 'Fundador Soberano', tipo: 'SOBERANA', saldo: '100000.0000' },
    { titular: 'Omnexis Corp', tipo: 'CORPORATIVA', saldo: '50000.0000' },
    { titular: 'Reserva Aurífera Zirok', tipo: 'RESERVA', saldo: '500000.0000' },
    { titular: 'Cuenta Circulación General', tipo: 'PERSONAL', saldo: '10000.0000' },
    { titular: 'Tesorería del Estado', tipo: 'SOBERANA', saldo: '250000.0000' },
  ];

  for (const c of cuentasData) {
    const numero = genNum();
    await new Promise(r => setTimeout(r, 10));
    const [cuenta] = await db.insert(cuentasSoberanas).values({
      numeroCuenta: numero,
      titular: c.titular,
      tipo: c.tipo,
      saldo: c.saldo,
      estado: 'ACTIVA',
    }).returning();

    await db.insert(operacionesCuenta).values({
      idCuenta: cuenta.id,
      tipo: 'APERTURA',
      monto: c.saldo,
      saldoAnterior: '0.0000',
      saldoResultante: c.saldo,
      descripcion: `Apertura fundacional — ${c.tipo}`,
      referencia: ref(),
    });

    console.log(`  ✓ ${c.titular} → ${numero} | ${Number(c.saldo).toLocaleString('es-ES')} ZC`);
  }

  console.log('\n[ZIRCOIN] Cuentas fundacionales activas. Banco Digital OPERATIVO.');
  process.exit(0);
}

seedCuentas().catch(e => { console.error(e); process.exit(1); });
