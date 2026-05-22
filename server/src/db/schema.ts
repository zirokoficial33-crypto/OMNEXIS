import { pgTable, serial, varchar, decimal, timestamp, boolean, integer, text } from 'drizzle-orm/pg-core';

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

export type ActivoReal = typeof activosReales.$inferSelect;
export type NuevoActivo = typeof activosReales.$inferInsert;
export type TransaccionZircoin = typeof libroMayorZircoin.$inferSelect;
export type NuevaTransaccion = typeof libroMayorZircoin.$inferInsert;
export type ComandoSoberano = typeof controlSoberano.$inferSelect;
export type NuevoComando = typeof controlSoberano.$inferInsert;
