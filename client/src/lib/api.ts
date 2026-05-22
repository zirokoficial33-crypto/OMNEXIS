const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || 'Error del servidor');
  }
  return res.json();
}

export const api = {
  dashboard: {
    stats: () => req<DashboardStats>('/dashboard/stats'),
    actividadReciente: () => req<TransaccionUI[]>('/dashboard/actividad-reciente'),
  },
  activos: {
    list: () => req<Activo[]>('/activos'),
    get: (id: number) => req<Activo>(`/activos/${id}`),
    create: (data: Partial<Activo>) => req<Activo>('/activos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Activo>) => req<Activo>(`/activos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<{ success: boolean }>(`/activos/${id}`, { method: 'DELETE' }),
  },
  transacciones: {
    list: () => req<TransaccionUI[]>('/transacciones'),
    emitir: (data: EmitirPayload) => req<TransaccionUI>('/transacciones/emitir', { method: 'POST', body: JSON.stringify(data) }),
    transferir: (data: TransferirPayload) => req<TransaccionUI>('/transacciones/transferir', { method: 'POST', body: JSON.stringify(data) }),
  },
  control: {
    list: () => req<ComandoSoberano[]>('/control'),
    create: (data: Partial<ComandoSoberano>) => req<ComandoSoberano>('/control', { method: 'POST', body: JSON.stringify(data) }),
    completar: (id: number, resultado?: string) => req<ComandoSoberano>(`/control/${id}/completar`, { method: 'PATCH', body: JSON.stringify({ resultado }) }),
    delete: (id: number) => req<{ success: boolean }>(`/control/${id}`, { method: 'DELETE' }),
  },
};

export interface Activo {
  id: number;
  nombreActivo: string;
  valorTasaZircoin: string;
  estadoDisponibilidad: string;
  categoria: string;
  descripcion: string;
  fechaCreacion: string;
}

export interface TransaccionUI {
  id: number;
  montoEmitido: string;
  serialBillete: string;
  origen: string;
  destino: string;
  tipoOperacion: string;
  timestampEmision: string;
  estatusEjecucion: string;
  idActivoRespaldo: number | null;
  nombreActivo: string | null;
}

export interface ComandoSoberano {
  id: number;
  comandoEjecutado: string;
  nivelPrioridad: number;
  ejecucionFinalizada: boolean;
  resultado: string | null;
  operador: string;
  fechaEjecucion: string;
}

export interface DashboardStats {
  totalActivos: number;
  totalEmitido: number;
  totalTransacciones: number;
  comandosPendientes: number;
  valorReservas: number;
  activosPorEstado: { estado: string; count: number }[];
  emisionPorDia: { fecha: string; total: number }[];
}

export interface EmitirPayload {
  montoEmitido: number;
  idActivoRespaldo?: number;
  destino?: string;
}

export interface TransferirPayload {
  montoEmitido: number;
  origen: string;
  destino: string;
  idActivoRespaldo?: number;
}

export function formatZC(val: string | number): string {
  const n = Number(val);
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
