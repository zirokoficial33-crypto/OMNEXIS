import { z } from 'zod';

export const crearCuentaSchema = z.object({
  titular: z.string().min(2, 'El titular debe tener al menos 2 caracteres').max(120),
  tipo: z.enum(['PERSONAL', 'CORPORATIVA', 'SOBERANA', 'RESERVA', 'TESORO']).optional(),
  saldoInicial: z.number().min(0, 'El saldo inicial no puede ser negativo').max(1_000_000_000).optional(),
});

export const depositarSchema = z.object({
  monto: z.number().positive('El monto debe ser mayor a cero').max(1_000_000_000),
  descripcion: z.string().max(255).optional(),
});

export const retirarSchema = z.object({
  monto: z.number().positive('El monto debe ser mayor a cero').max(1_000_000_000),
  descripcion: z.string().max(255).optional(),
});

export const transferirSchema = z.object({
  numeroCuentaOrigen: z.string().min(5, 'Número de cuenta origen inválido'),
  numeroCuentaDestino: z.string().min(5, 'Número de cuenta destino inválido'),
  monto: z.number().positive('El monto debe ser mayor a cero').max(1_000_000_000),
  descripcion: z.string().max(255).optional(),
}).refine(d => d.numeroCuentaOrigen !== d.numeroCuentaDestino, {
  message: 'La cuenta origen y destino no pueden ser la misma',
  path: ['numeroCuentaDestino'],
});

export const crearPrestamoSchema = z.object({
  idCuentaDeudor: z.number().int().positive('ID de cuenta inválido'),
  montoPrincipal: z.number().positive('El monto debe ser mayor a cero').max(500_000_000),
  plazo: z.number().int().min(1).max(360, 'El plazo máximo es 360 meses'),
  proposito: z.string().max(255).optional(),
});

export const pagarPrestamoSchema = z.object({
  monto: z.number().positive('El monto del pago debe ser mayor a cero').max(500_000_000),
  idCuentaPagadora: z.number().int().positive().optional(),
});

export const emitirCertificadoSchema = z.object({
  denominacion: z.number().positive('La denominación debe ser mayor a cero').max(1_000_000_000),
  idActivoRespaldo: z.number().int().positive().optional(),
  idCuentaTenedor: z.number().int().positive().optional(),
  clase: z.enum(['SOBERANO', 'CORPORATIVO', 'RESERVA', 'ACTIVO', 'DIGITAL']).optional(),
  descripcion: z.string().max(500).optional(),
  diasVigencia: z.number().int().min(1).max(3650).optional(),
});

export const transferirCertificadoSchema = z.object({
  idCuentaDestino: z.number().int().positive('ID de cuenta destino inválido'),
  notas: z.string().max(255).optional(),
});

export const redimirCertificadoSchema = z.object({
  idCuentaCobro: z.number().int().positive().optional(),
  notas: z.string().max(255).optional(),
});

export const expansionManualSchema = z.object({
  nombreActivo: z.string().min(2).max(120),
  valorZircoin: z.number().positive('El valor debe ser mayor a cero').max(1_000_000_000),
  categoria: z.string().max(60).optional(),
  descripcion: z.string().max(500).optional(),
});

export const expansionCuanticaSchema = z.object({
  ciclosAFirar: z.number().int().min(1).max(10).default(1),
});

export const loginSchema = z.object({
  clave: z.string().min(6, 'La clave debe tener al menos 6 caracteres'),
  rol: z.enum(['OPERADOR', 'SOBERANO', 'AUDITOR']).default('OPERADOR'),
});
