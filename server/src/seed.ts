import { db, activosReales, libroMayorZircoin, controlSoberano } from './db';

async function seed() {
  console.log('[ZIRCOIN] Iniciando seed de datos...');

  const activos = await db.insert(activosReales).values([
    {
      nombreActivo: 'Lote_Popsicles_001',
      valorTasaZircoin: '25000.00',
      estadoDisponibilidad: 'OPERATIVO',
      categoria: 'COMMODITIES',
      descripcion: 'Lote de productos Omnexis — capacidad productiva respaldada',
    },
    {
      nombreActivo: 'Infraestructura_Digital_Core',
      valorTasaZircoin: '150000.00',
      estadoDisponibilidad: 'OPERATIVO',
      categoria: 'TECNOLOGIA',
      descripcion: 'Servidores y capacidad computacional del sistema Zirok',
    },
    {
      nombreActivo: 'Reserva_Oro_Soberana',
      valorTasaZircoin: '500000.00',
      estadoDisponibilidad: 'RESERVA',
      categoria: 'COMMODITIES',
      descripcion: 'Reserva aurífera del Banco Central Zirok',
    },
    {
      nombreActivo: 'Datos_Productivos_Omnexis',
      valorTasaZircoin: '75000.00',
      estadoDisponibilidad: 'OPERATIVO',
      categoria: 'DATOS',
      descripcion: 'Activo de datos estratégicos respaldando circulación soberana',
    },
  ]).returning();

  const [activoPrincipal] = activos;

  await db.insert(libroMayorZircoin).values([
    {
      montoEmitido: '5000.00',
      idActivoRespaldo: activoPrincipal.id,
      serialBillete: 'ZC001A',
      origen: 'BANCO_CENTRAL_ZIROK',
      destino: 'CIRCULACION_SOBERANA',
      tipoOperacion: 'EMISION',
      estatusEjecucion: 'MANIFESTADO',
    },
    {
      montoEmitido: '12500.00',
      idActivoRespaldo: activos[1].id,
      serialBillete: 'ZC002B',
      origen: 'BANCO_CENTRAL_ZIROK',
      destino: 'CUENTA_OMNEXIS_01',
      tipoOperacion: 'EMISION',
      estatusEjecucion: 'MANIFESTADO',
    },
    {
      montoEmitido: '3000.00',
      idActivoRespaldo: null,
      serialBillete: 'ZC003C',
      origen: 'CUENTA_OMNEXIS_01',
      destino: 'CUENTA_SOBERANA_002',
      tipoOperacion: 'TRANSFERENCIA',
      estatusEjecucion: 'CONFIRMADO',
    },
  ]);

  await db.insert(controlSoberano).values([
    {
      comandoEjecutado: 'INICIALIZAR_BANCO_CENTRAL_ZIROK',
      nivelPrioridad: 3,
      ejecucionFinalizada: true,
      resultado: 'SISTEMA_OPERATIVO_CONFIRMADO',
      operador: 'FUNDADOR_SOBERANO',
    },
    {
      comandoEjecutado: 'AUDITORIA_RESERVAS_COMPLETA',
      nivelPrioridad: 2,
      ejecucionFinalizada: false,
      operador: 'SISTEMA_CENTRAL',
    },
  ]);

  console.log('[ZIRCOIN] Seed completado con éxito.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
