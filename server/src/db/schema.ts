import { pgTable, serial, varchar, decimal, timestamp, boolean, integer, text, bigint } from 'drizzle-orm/pg-core';

export const activosReales = pgTable('activos_reales', {
  id: serial('id').primaryKey(),
  nombreActivo: varchar('nombre_activo', { length: 100 }).notNull(),
  valorTasaZircoin: decimal('valor_tasa_zircoin', { precision: 15, scale: 2 }).notNull(),
  estadoDisponibilidad: varchar('estado_disponibilidad', { length: 50 }).default('OPERATIVO'),
  categoria: varchar('categoria', { length: 50 }).default('GENERAL'),
  descripcion: text('descripcion'),
  fechaCreacion: timestamp('fecha_creacion').defaultNow(),
});

export const libroMayorZircoin = pgTable('libro_mayor_zircoin', {
  id: serial('id').primaryKey(),
  montoEmitido: decimal('monto_emitido', { precision: 20, scale: 2 }).notNull(),
  idActivoRespaldo: integer('id_activo_respaldo').references(() => activosReales.id),
  serialBillete: varchar('serial_billete', { length: 20 }),
  origen: varchar('origen', { length: 100 }),
  destino: varchar('destino', { length: 100 }),
  tipoOperacion: varchar('tipo_operacion', { length: 50 }).default('EMISION'),
  timestampEmision: timestamp('timestamp_emision').defaultNow(),
  estatusEjecucion: varchar('estatus_ejecucion', { length: 30 }).default('MANIFESTADO'),
});

export const controlSoberano = pgTable('control_soberano', {
  id: serial('id').primaryKey(),
  comandoEjecutado: text('comando_ejecutado').notNull(),
  nivelPrioridad: integer('nivel_prioridad').default(1),
  ejecucionFinalizada: boolean('ejecucion_finalizada').default(false),
  resultado: text('resultado'),
  operador: varchar('operador', { length: 100 }).default('SISTEMA_CENTRAL'),
  fechaEjecucion: timestamp('fecha_ejecucion').defaultNow(),
});

export const cuentasSoberanas = pgTable('cuentas_soberanas', {
  id: serial('id').primaryKey(),
  numeroCuenta: varchar('numero_cuenta', { length: 20 }).notNull().unique(),
  titular: varchar('titular', { length: 100 }).notNull(),
  tipo: varchar('tipo', { length: 50 }).default('PERSONAL'),
  saldo: decimal('saldo', { precision: 25, scale: 4 }).default('0.0000'),
  estado: varchar('estado', { length: 30 }).default('ACTIVA'),
  fechaApertura: timestamp('fecha_apertura').defaultNow(),
  ultimaOperacion: timestamp('ultima_operacion').defaultNow(),
});

export const operacionesCuenta = pgTable('operaciones_cuenta', {
  id: serial('id').primaryKey(),
  idCuenta: integer('id_cuenta').references(() => cuentasSoberanas.id).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(),
  monto: decimal('monto', { precision: 20, scale: 4 }).notNull(),
  saldoAnterior: decimal('saldo_anterior', { precision: 25, scale: 4 }),
  saldoResultante: decimal('saldo_resultante', { precision: 25, scale: 4 }),
  descripcion: text('descripcion'),
  cuentaContraparte: varchar('cuenta_contraparte', { length: 20 }),
  referencia: varchar('referencia', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const historialExpansion = pgTable('historial_expansion', {
  id: serial('id').primaryKey(),
  nombreActivo: varchar('nombre_activo', { length: 100 }),
  valorActivo: decimal('valor_activo', { precision: 20, scale: 2 }),
  deltaEmitido: decimal('delta_emitido', { precision: 20, scale: 4 }),
  totalAcumulado: decimal('total_acumulado', { precision: 25, scale: 4 }),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const bancoCentralZirok = pgTable('banco_central_zirok', {
  idBanco: serial('id_banco').primaryKey(),
  nombreBanco: varchar('nombre_banco', { length: 100 }).default('Banco de Soberanía Absoluta'),
  totalEmitido: decimal('total_emitido', { precision: 25, scale: 4 }).default('0.0000'),
  factorCrecimiento: decimal('factor_crecimiento', { precision: 5, scale: 3 }).default('1.618'),
  transaccionesTotales: integer('transacciones_totales').default(0),
  ultimaActualizacion: timestamp('ultima_actualizacion').defaultNow(),
});

export const prestamosSoberanos = pgTable('prestamos_soberanos', {
  id: serial('id').primaryKey(),
  idCuentaDeudor: integer('id_cuenta_deudor').references(() => cuentasSoberanas.id).notNull(),
  idCuentaAcreedor: integer('id_cuenta_acreedor').references(() => cuentasSoberanas.id),
  montoPrincipal: decimal('monto_principal', { precision: 20, scale: 4 }).notNull(),
  montoRestante: decimal('monto_restante', { precision: 20, scale: 4 }).notNull(),
  tasaInteres: decimal('tasa_interes', { precision: 5, scale: 3 }).default('1.618'),
  plazo: integer('plazo').notNull(),
  proposito: text('proposito'),
  estado: varchar('estado', { length: 30 }).default('ACTIVO'),
  totalPagado: decimal('total_pagado', { precision: 20, scale: 4 }).default('0.0000'),
  totalIntereses: decimal('total_intereses', { precision: 20, scale: 4 }).default('0.0000'),
  fechaOtorgamiento: timestamp('fecha_otorgamiento').defaultNow(),
  fechaVencimiento: timestamp('fecha_vencimiento').notNull(),
});

export const pagosPrestamo = pgTable('pagos_prestamo', {
  id: serial('id').primaryKey(),
  idPrestamo: integer('id_prestamo').references(() => prestamosSoberanos.id).notNull(),
  monto: decimal('monto', { precision: 20, scale: 4 }).notNull(),
  montoCapital: decimal('monto_capital', { precision: 20, scale: 4 }),
  montoInteres: decimal('monto_interes', { precision: 20, scale: 4 }),
  saldoRestante: decimal('saldo_restante', { precision: 20, scale: 4 }),
  concepto: varchar('concepto', { length: 100 }),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const alertasSistema = pgTable('alertas_sistema', {
  id: serial('id').primaryKey(),
  tipo: varchar('tipo', { length: 60 }).notNull(),
  nivel: varchar('nivel', { length: 20 }).default('INFO'),
  mensaje: text('mensaje').notNull(),
  entidadTipo: varchar('entidad_tipo', { length: 50 }),
  entidadId: integer('entidad_id'),
  leida: boolean('leida').default(false),
  timestamp: timestamp('timestamp').defaultNow(),
});

export type ActivoReal = typeof activosReales.$inferSelect;
export type NuevoActivo = typeof activosReales.$inferInsert;
export type TransaccionZircoin = typeof libroMayorZircoin.$inferSelect;
export type NuevaTransaccion = typeof libroMayorZircoin.$inferInsert;
export type ComandoSoberano = typeof controlSoberano.$inferSelect;
export type NuevoComando = typeof controlSoberano.$inferInsert;
export type BancoCentral = typeof bancoCentralZirok.$inferSelect;
export type CuentaSoberana = typeof cuentasSoberanas.$inferSelect;
export type NuevaCuenta = typeof cuentasSoberanas.$inferInsert;
export type OperacionCuenta = typeof operacionesCuenta.$inferSelect;
export type PrestamoSoberano = typeof prestamosSoberanos.$inferSelect;
export type PagoPrestamo = typeof pagosPrestamo.$inferSelect;
export type AlertaSistema = typeof alertasSistema.$inferSelect;
