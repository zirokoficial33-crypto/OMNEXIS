import { useEffect, useState } from 'react';
import { api, DashboardStats, TransaccionUI, formatZC, formatDate } from '../lib/api';
import { TrendingUp, Database, Coins, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actividad, setActividad] = useState<TransaccionUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const [s, a] = await Promise.all([api.dashboard.stats(), api.dashboard.actividadReciente()]);
      setStats(s);
      setActividad(a);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const metricCards = stats ? [
    {
      label: 'Total Emitido',
      value: `${formatZC(stats.totalEmitido)} ZC`,
      sub: `${stats.totalTransacciones} operaciones`,
      icon: Coins,
      color: 'text-amber-400',
      bg: 'bg-amber-950/30 border-amber-900/40',
    },
    {
      label: 'Valor Reservas',
      value: `${formatZC(stats.valorReservas)} ZC`,
      sub: `${stats.totalActivos} activos reales`,
      icon: Database,
      color: 'text-sky-400',
      bg: 'bg-sky-950/30 border-sky-900/40',
    },
    {
      label: 'Transacciones',
      value: stats.totalTransacciones.toLocaleString(),
      sub: 'operaciones confirmadas',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30 border-emerald-900/40',
    },
    {
      label: 'Comandos Pendientes',
      value: stats.comandosPendientes.toLocaleString(),
      sub: 'en cola de ejecución',
      icon: Shield,
      color: 'text-purple-400',
      bg: 'bg-purple-950/30 border-purple-900/40',
    },
  ] : [];

  const chartData = stats?.emisionPorDia.map(d => ({
    fecha: new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
    total: Number(d.total),
  })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2f0ff] glow-text">Panel Central</h1>
          <p className="text-sm text-[#7aa8cc] mt-0.5">Banco de Soberanía Absoluta — Vista en tiempo real</p>
        </div>
        <button onClick={cargar} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-24 bg-[#0d1b2e]" />
            ))
          : metricCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className={`card border ${bg}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">{label}</p>
                    <p className={`text-xl font-bold mt-1 font-mono ${color}`}>{value}</p>
                    <p className="text-xs text-[#3d6485] mt-1">{sub}</p>
                  </div>
                  <Icon className={`w-5 h-5 ${color} opacity-70`} />
                </div>
              </div>
            ))
        }
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card">
          <h2 className="text-sm font-semibold text-[#e2f0ff] mb-4">Emisión ZIRCOIN — Últimos 7 días</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="zcGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="fecha" tick={{ fill: '#3d6485', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#3d6485', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2035', border: '1px solid #1a3350', borderRadius: '8px', color: '#e2f0ff' }}
                  formatter={(v: number) => [`${formatZC(v)} ZC`, 'Emitido']}
                />
                <Area type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} fill="url(#zcGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[#3d6485] text-sm">
              Sin datos de emisión aún
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-[#e2f0ff] mb-4">Estado de Activos</h2>
          {stats?.activosPorEstado && stats.activosPorEstado.length > 0 ? (
            <div className="space-y-3">
              {stats.activosPorEstado.map(({ estado, count }) => (
                <div key={estado} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      estado === 'OPERATIVO' ? 'bg-emerald-400' :
                      estado === 'RESERVA' ? 'bg-amber-400' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm text-[#7aa8cc]">{estado}</span>
                  </div>
                  <span className="font-mono text-sm text-[#e2f0ff]">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[#3d6485] text-sm py-8">Sin activos registrados</div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-[#e2f0ff] mb-4">Actividad Reciente</h2>
        {actividad.length === 0 ? (
          <div className="text-center text-[#3d6485] text-sm py-8">Sin actividad registrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#3d6485] text-xs uppercase tracking-wider">
                  <th className="text-left pb-3 pr-4">Serial</th>
                  <th className="text-left pb-3 pr-4">Tipo</th>
                  <th className="text-right pb-3 pr-4">Monto</th>
                  <th className="text-left pb-3 pr-4">Activo</th>
                  <th className="text-left pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3350]">
                {actividad.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#0d1b2e] transition-colors">
                    <td className="py-2.5 pr-4"><span className="tag-mono">{tx.serialBillete}</span></td>
                    <td className="py-2.5 pr-4 text-[#7aa8cc]">{tx.tipoOperacion}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-amber-400">{formatZC(tx.montoEmitido)} ZC</td>
                    <td className="py-2.5 pr-4 text-[#7aa8cc] truncate max-w-[140px]">{tx.nombreActivo || '—'}</td>
                    <td className="py-2.5">
                      <span className={tx.estatusEjecucion === 'MANIFESTADO' ? 'badge-manifestado' : 'badge-confirmado'}>
                        {tx.estatusEjecucion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
