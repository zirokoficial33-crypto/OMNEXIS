import { useEffect, useState, useCallback } from 'react';
import { api, formatZC, formatDate } from '../lib/api';
import {
  Brain, Activity, TrendingUp, Shield, AlertTriangle,
  CheckCircle2, Zap, RefreshCw, Bell, BellOff, X,
  BarChart3, Cpu, Target
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';

const PHI = 1.618033988749895;
const COLORES_TIPO = {
  SOBERANA: '#f59e0b',
  CORPORATIVA: '#a855f7',
  RESERVA: '#0ea5e9',
  PERSONAL: '#6b7280',
};

function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'ÓPTIMO' : score >= 50 ? 'ATENCIÓN' : 'CRÍTICO';
  const pct = score / 100;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ * 0.75;
  const offset = dash * (1 - pct);
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="100" viewBox="0 0 140 100">
        <path d="M 20 90 A 52 52 0 1 1 120 90" fill="none" stroke="#1a3350" strokeWidth="10" strokeLinecap="round" />
        <path d="M 20 90 A 52 52 0 1 1 120 90" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash * pct} ${dash * (1 - pct) + circ * 0.25}`}
          style={{ transition: 'stroke-dasharray 1.2s ease' }} />
        <text x="70" y="78" textAnchor="middle" fill={color} fontSize="26" fontWeight="bold" fontFamily="monospace">{score}</text>
      </svg>
      <span className="text-xs font-mono font-bold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

function NivelBadge({ nivel }: { nivel: string }) {
  const cls = nivel === 'CRITICAL' ? 'text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800/50' :
    nivel === 'WARNING' ? 'text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-800/50' :
    'text-xs px-2 py-0.5 rounded-full bg-sky-900/50 text-sky-400 border border-sky-800/50';
  return <span className={cls}>{nivel}</span>;
}

export default function Inteligencia() {
  const [panorama, setPanorama] = useState<any>(null);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluando, setEvaluando] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, a] = await Promise.all([api.inteligencia.panorama(), api.alertas.list()]);
      setPanorama(p);
      setAlertas(a);
      setLastUpdate(new Date());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); const i = setInterval(() => cargar(true), 10000); return () => clearInterval(i); }, [cargar]);

  async function evaluar() {
    setEvaluando(true);
    try {
      await api.alertas.evaluar();
      await cargar(true);
    } catch (e: any) { setError(e.message); }
    finally { setEvaluando(false); }
  }

  async function leerAlerta(id: number) {
    await api.alertas.leer(id);
    setAlertas(a => a.map(x => x.id === id ? { ...x, leida: true } : x));
  }

  async function leerTodas() {
    await api.alertas.leerTodas();
    setAlertas(a => a.map(x => ({ ...x, leida: true })));
  }

  const distribucion = panorama?.cuentas?.distribucionTipo?.map((d: any) => ({
    name: d.tipo, value: Number(d.saldo), cantidad: Number(d.cantidad),
    fill: COLORES_TIPO[d.tipo as keyof typeof COLORES_TIPO] || '#6b7280',
  })) ?? [];

  const proyeccion = panorama?.inteligencia?.proyeccion7d ?? [];
  const alertasNoLeidas = alertas.filter(a => !a.leida);

  if (loading) return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-[#0d1b2e] rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-6 space-y-5 overflow-y-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2f0ff] flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Motor de Inteligencia
          </h1>
          <p className="text-sm text-[#7aa8cc] mt-0.5">
            Análisis sistémico en tiempo real · φ = {PHI.toFixed(6)} · {lastUpdate ? formatDate(lastUpdate.toISOString()) : '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={evaluar} disabled={evaluando} className="btn-secondary flex items-center gap-2 text-xs">
            <Cpu className={`w-3.5 h-3.5 ${evaluando ? 'animate-spin' : ''}`} />
            {evaluando ? 'Evaluando...' : 'Evaluar Sistema'}
          </button>
          <button onClick={() => cargar(true)} className="btn-secondary flex items-center gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* FILA 1: HEALTH + MÉTRICAS CLAVE */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card border-purple-900/40 bg-purple-950/10 flex flex-col items-center justify-center py-2">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider mb-2">Health Score</p>
          <HealthGauge score={panorama?.inteligencia?.healthScore ?? 100} />
        </div>
        {[
          { label: 'ZC Banco Central', value: `${formatZC(panorama?.banco?.totalEmitido ?? 0)} ZC`, sub: `${panorama?.banco?.transaccionesTotales ?? 0} expansiones`, color: 'text-amber-400', border: 'border-amber-900/30' },
          { label: 'ZC en Cuentas', value: `${formatZC(panorama?.cuentas?.saldoTotal ?? 0)} ZC`, sub: `${panorama?.cuentas?.activas ?? 0} cuentas activas`, color: 'text-sky-400', border: 'border-sky-900/30' },
          { label: 'Cartera Crédito', value: `${formatZC(panorama?.prestamos?.totalRestante ?? 0)} ZC`, sub: `${panorama?.prestamos?.activos ?? 0} activos · ${panorama?.prestamos?.vencidos ?? 0} vencidos`, color: panorama?.prestamos?.vencidos > 0 ? 'text-red-400' : 'text-emerald-400', border: panorama?.prestamos?.vencidos > 0 ? 'border-red-900/30' : 'border-emerald-900/30' },
        ].map(({ label, value, sub, color, border }) => (
          <div key={label} className={`card ${border} flex flex-col justify-between`}>
            <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">{label}</p>
            <p className={`text-xl font-bold font-mono mt-2 ${color}`}>{value}</p>
            <p className="text-xs text-[#3d6485] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* FILA 2: INDICADORES INTELIGENCIA */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card border-[#2a4a6e]">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider mb-3 flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Velocidad de Expansión</p>
          <p className="text-2xl font-bold font-mono text-amber-400">{formatZC(panorama?.inteligencia?.velocidadExpansion ?? 0)}</p>
          <p className="text-xs text-[#3d6485] mt-1">ZC promedio por evento de expansión</p>
          <div className="mt-3 pt-3 border-t border-[#1a3350] text-xs text-[#3d6485] font-mono">
            Factor φ activo: <span className="text-amber-400">{PHI.toFixed(4)}</span>
          </div>
        </div>
        <div className="card border-[#2a4a6e]">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider mb-3 flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Actividad 24h</p>
          <p className="text-2xl font-bold font-mono text-sky-400">{panorama?.inteligencia?.ops24h?.count ?? 0}</p>
          <p className="text-xs text-[#3d6485] mt-1">operaciones · {formatZC(panorama?.inteligencia?.ops24h?.volumen ?? 0)} ZC movidos</p>
          <div className="mt-3 pt-3 border-t border-[#1a3350] text-xs text-[#3d6485] font-mono">
            Emisiones totales: <span className="text-sky-400">{panorama?.circulacion?.totalOperaciones ?? 0}</span>
          </div>
        </div>
        <div className="card border-[#2a4a6e]">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider mb-3 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Intereses φ Generados</p>
          <p className="text-2xl font-bold font-mono text-purple-400">{formatZC(panorama?.prestamos?.totalIntereses ?? 0)}</p>
          <p className="text-xs text-[#3d6485] mt-1">ZC generados por tasa φ en préstamos</p>
          <div className="mt-3 pt-3 border-t border-[#1a3350] text-xs text-[#3d6485] font-mono">
            Activos reales: <span className="text-purple-400">{formatZC(panorama?.activos?.valorTotal ?? 0)} ZC</span>
          </div>
        </div>
      </div>

      {/* FILA 3: PROYECCIÓN + DISTRIBUCIÓN */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 card">
          <h2 className="text-sm font-semibold text-[#e2f0ff] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" /> Proyección Expansión — Próximos 7 Días (×φ)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={proyeccion}>
              <defs>
                <linearGradient id="phiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a3350" />
              <XAxis dataKey="dia" tick={{ fill: '#3d6485', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={d => `Día ${d}`} />
              <YAxis tick={{ fill: '#3d6485', fontSize: 11 }} axisLine={false} tickLine={false} width={70}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#0f2035', border: '1px solid #1a3350', borderRadius: '8px', color: '#e2f0ff' }}
                formatter={(v: number) => [`${formatZC(v)} ZC`, 'Proyectado']} />
              <Area type="monotone" dataKey="proyectado" stroke="#f59e0b" strokeWidth={2} fill="url(#phiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-2 card">
          <h2 className="text-sm font-semibold text-[#e2f0ff] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" /> ZC por Tipo de Cuenta
          </h2>
          {distribucion.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={distribucion} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                    {distribucion.map((d: any, i: number) => <Cell key={i} fill={d.fill} opacity={0.85} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f2035', border: '1px solid #1a3350', borderRadius: '8px', color: '#e2f0ff' }}
                    formatter={(v: number) => [`${formatZC(v)} ZC`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {distribucion.map((d: any) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-[#7aa8cc]">{d.name}</span>
                      <span className="text-[#3d6485]">×{d.cantidad}</span>
                    </div>
                    <span className="font-mono text-[#e2f0ff]">{formatZC(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="text-center py-8 text-[#3d6485] text-sm">Sin datos de distribución</div>}
        </div>
      </div>

      {/* ALERTAS */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#e2f0ff] flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            Alertas del Sistema
            {alertasNoLeidas.length > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800/50">
                {alertasNoLeidas.length} sin leer
              </span>
            )}
          </h2>
          {alertasNoLeidas.length > 0 && (
            <button onClick={leerTodas} className="text-xs text-[#7aa8cc] hover:text-[#e2f0ff] flex items-center gap-1">
              <BellOff className="w-3.5 h-3.5" /> Leer todas
            </button>
          )}
        </div>
        {alertas.length === 0 ? (
          <div className="text-center py-8 text-[#3d6485] text-sm flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 opacity-20" />
            Sin alertas activas — Sistema en equilibrio
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alertas.slice(0, 20).map(a => (
              <div key={a.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${a.leida ? 'bg-[#0a1525] border-[#1a3350] opacity-50' : a.nivel === 'CRITICAL' ? 'bg-red-950/15 border-red-900/40' : a.nivel === 'WARNING' ? 'bg-amber-950/15 border-amber-900/40' : 'bg-[#0a1525] border-[#1a3350]'}`}>
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.leida ? 'bg-[#3d6485]' : a.nivel === 'CRITICAL' ? 'bg-red-400' : a.nivel === 'WARNING' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <NivelBadge nivel={a.nivel} />
                    <span className="text-[10px] font-mono text-[#3d6485]">{a.tipo}</span>
                  </div>
                  <p className="text-sm text-[#e2f0ff]">{a.mensaje}</p>
                  <p className="text-[10px] text-[#3d6485] mt-0.5">{formatDate(a.timestamp)}</p>
                </div>
                {!a.leida && (
                  <button onClick={() => leerAlerta(a.id)} className="shrink-0 p-1 text-[#3d6485] hover:text-[#e2f0ff]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
