import { useEffect, useState, useRef, useCallback } from 'react';
import { api, formatZC, formatDate } from '../lib/api';
import { Infinity, Zap, TrendingUp, AlertCircle, RefreshCw, Plus, X, Crown, Atom, Activity, Cpu } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

const PHI = 1.618033988749895;

const DIMENSIONES_CONFIG: Record<string, { color: string; bg: string; border: string; simbolo: string; glow: string }> = {
  TEMPORAL:   { color: '#f59e0b', bg: 'bg-amber-950/20',   border: 'border-amber-800/40',   simbolo: '⏳', glow: 'shadow-amber-500/20' },
  ENERGETICA: { color: '#0ea5e9', bg: 'bg-sky-950/20',     border: 'border-sky-800/40',     simbolo: '⚡', glow: 'shadow-sky-500/20' },
  MATERIAL:   { color: '#10b981', bg: 'bg-emerald-950/20', border: 'border-emerald-800/40', simbolo: '🔮', glow: 'shadow-emerald-500/20' },
  DATOS:      { color: '#8b5cf6', bg: 'bg-purple-950/20',  border: 'border-purple-800/40',  simbolo: '∞',  glow: 'shadow-purple-500/20' },
  SOBERANIA:  { color: '#ef4444', bg: 'bg-red-950/20',     border: 'border-red-800/40',     simbolo: '👑', glow: 'shadow-red-500/20' },
};

interface BancoCentral { idBanco: number; nombreBanco: string; totalEmitido: string; factorCrecimiento: string; transaccionesTotales: number; ultimaActualizacion: string; }
interface HistorialEntry { id: number; nombreActivo: string; valorActivo: string; deltaEmitido: string; totalAcumulado: string; timestamp: string; }
interface CicloCuantico { id: number; cicloNumero: number; dimension: string; factorAplicado: string; valorBase: string; valorResultado: string; delta: string; energiaCuantica: string; estado: string; timestamp: string; }
interface CicloStats { totalCiclos: number; totalDelta: number; maxFactor: number; energiaTotal: number; ultimoCiclo: number; }

function AnimatedCounter({ value, decimals = 4 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const start = prevRef.current, end = value;
    if (start === end) return;
    const duration = 1400, startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime, progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplay(start + (end - start) * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
      else prevRef.current = end;
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);
  return <span>{new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(display)}</span>;
}

function QuantumOrb({ dim, active, size = 48 }: { dim: string; active: boolean; size?: number }) {
  const cfg = DIMENSIONES_CONFIG[dim] || DIMENSIONES_CONFIG.TEMPORAL;
  return (
    <div className={`relative flex items-center justify-center rounded-full transition-all duration-500 ${active ? 'scale-110' : 'scale-90 opacity-50'}`}
      style={{ width: size, height: size, backgroundColor: cfg.color + '15', border: `1px solid ${cfg.color}40`, boxShadow: active ? `0 0 20px ${cfg.color}50` : 'none' }}>
      <span className="text-lg">{cfg.simbolo}</span>
      {active && <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: cfg.color + '15' }} />}
    </div>
  );
}

const CATEGORIAS = ['EXPANSION', 'SOBERANIA', 'COMMODITIES', 'TECNOLOGIA', 'DATOS', 'GENERAL'];

export default function Expansion() {
  const [banco, setBanco] = useState<BancoCentral | null>(null);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [ciclos, setCiclos] = useState<CicloCuantico[]>([]);
  const [cicloStats, setCicloStats] = useState<CicloStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firandoCuantico, setFirandoCuantico] = useState(false);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [lastCiclo, setLastCiclo] = useState<CicloCuantico | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'historial' | 'cuantico'>('cuantico');
  const [form, setForm] = useState({ nombreActivo: '', valorZircoin: '', categoria: 'EXPANSION', descripcion: '' });

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [b, h, c, cs] = await Promise.all([
        api.banco.get(),
        api.banco.historial(),
        api.banco.ciclosCuanticos(),
        api.banco.ciclosStats(),
      ]);
      setBanco(prev => {
        if (prev && b && Number(b.totalEmitido) !== Number(prev.totalEmitido)) {
          const delta = Number(b.totalEmitido) - Number(prev.totalEmitido);
          setLastDelta(delta);
          setPulseKey(k => k + 1);
          setTimeout(() => setLastDelta(null), 3500);
        }
        return b;
      });
      setHistorial(h);
      setCiclos(c);
      setCicloStats(cs);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    cargar();
    const i = setInterval(() => cargar(true), 4000);
    return () => clearInterval(i);
  }, [cargar]);

  async function activarExpansion() {
    if (!form.nombreActivo || !form.valorZircoin) return;
    setSaving(true);
    try {
      await api.banco.activarExpansion({ nombreActivo: form.nombreActivo.toUpperCase().replace(/\s+/g, '_'), valorZircoin: Number(form.valorZircoin), categoria: form.categoria, descripcion: form.descripcion });
      setShowModal(false);
      setForm({ nombreActivo: '', valorZircoin: '', categoria: 'EXPANSION', descripcion: '' });
      await cargar(true);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function firarCuantico(ciclosAFirar = 1) {
    setFirandoCuantico(true);
    try {
      const res = await api.banco.expansionCuantica(ciclosAFirar);
      if (res.ciclosCreados?.length > 0) {
        setLastCiclo(res.ciclosCreados[res.ciclosCreados.length - 1]);
        setTimeout(() => setLastCiclo(null), 5000);
      }
      await cargar(true);
    } catch (e: any) { setError(e.message); }
    finally { setFirandoCuantico(false); }
  }

  const total = Number(banco?.totalEmitido ?? 0);
  const factor = Number(banco?.factorCrecimiento ?? PHI);
  const dimActual = ciclos[0]?.dimension ?? 'TEMPORAL';
  const dimCfg = DIMENSIONES_CONFIG[dimActual] || DIMENSIONES_CONFIG.TEMPORAL;

  // Datos para el gráfico de expansión cuántica
  const chartData = ciclos.slice().reverse().map((c, i) => ({
    ciclo: c.cicloNumero,
    delta: Number(c.delta),
    energia: Number(c.energiaCuantica),
    label: `C${c.cicloNumero}`,
  }));

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2f0ff] flex items-center gap-2">
            <Infinity className="w-5 h-5 text-amber-400" />
            Expansión Infinita
            <span className="text-xs font-mono text-[#3d6485] font-normal">· φ = {PHI.toFixed(6)}</span>
          </h1>
          <p className="text-sm text-[#7aa8cc] mt-0.5">Motor Cuántico de Auto-Evolución — {cicloStats?.totalCiclos ?? 0} ciclos ejecutados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cargar(true)} className="btn-secondary p-2"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus className="w-3.5 h-3.5" /> Manual
          </button>
          <button onClick={() => firarCuantico(1)} disabled={firandoCuantico}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-800/50 hover:bg-purple-700/60 text-purple-300 text-sm border border-purple-700/50 disabled:opacity-50 transition-all">
            <Atom className={`w-4 h-4 ${firandoCuantico ? 'animate-spin' : ''}`} />
            {firandoCuantico ? 'Evolucionando...' : 'Ciclo Cuántico'}
          </button>
          <button onClick={() => firarCuantico(5)} disabled={firandoCuantico}
            className="btn-gold flex items-center gap-2 disabled:opacity-50">
            <Zap className="w-4 h-4" /> ×5 Ciclos
          </button>
        </div>
      </div>

      {error && <div className="card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm"><AlertCircle className="w-4 h-4" />{error}<button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button></div>}

      {/* NÚCLEO PRINCIPAL */}
      <div className={`card border-amber-900/50 bg-gradient-to-br from-amber-950/30 to-[#0f2035] relative overflow-hidden`} key={pulseKey}>
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-amber-500/5 animate-ping" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: `${(i + 1) * 30}%`, height: `${(i + 1) * 30}%`, animationDuration: `${3 + i * 1.5}s`, animationDelay: `${i * 0.5}s` }} />
          ))}
        </div>
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs text-amber-400/70 uppercase tracking-widest font-mono mb-2">◆ TOTAL EMITIDO — BANCO CENTRAL ZIROK</p>
            {loading ? <div className="h-14 w-72 bg-[#0d1b2e] rounded-lg animate-pulse" /> : (
              <p className="text-5xl font-bold font-mono text-amber-400" style={{ textShadow: '0 0 30px rgba(245,158,11,0.4)' }}>
                <AnimatedCounter value={total} decimals={4} /><span className="text-2xl ml-2 text-amber-600">ZC</span>
              </p>
            )}
            {banco && <p className="text-xs text-[#3d6485] font-mono mt-2">{banco.transaccionesTotales} expansiones · {formatDate(banco.ultimaActualizacion)}</p>}
            {lastDelta !== null && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 text-sm font-mono animate-bounce">
                <TrendingUp className="w-4 h-4" /> +{formatZC(lastDelta)} ZC materializado
              </div>
            )}
            {lastCiclo && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono border"
                style={{ backgroundColor: (DIMENSIONES_CONFIG[lastCiclo.dimension]?.color ?? '#f59e0b') + '15', borderColor: (DIMENSIONES_CONFIG[lastCiclo.dimension]?.color ?? '#f59e0b') + '40', color: DIMENSIONES_CONFIG[lastCiclo.dimension]?.color ?? '#f59e0b' }}>
                <Atom className="w-4 h-4" />
                Ciclo #{lastCiclo.cicloNumero} · {lastCiclo.dimension} · φ^{Number(lastCiclo.factorAplicado).toFixed(3)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <Crown className="w-8 h-8 text-amber-500/30" />
            <div className="flex gap-2">
              {Object.keys(DIMENSIONES_CONFIG).map(dim => (
                <QuantumOrb key={dim} dim={dim} active={dimActual === dim} size={36} />
              ))}
            </div>
            <p className="text-[10px] font-mono text-[#3d6485]">dimensión activa: <span style={{ color: dimCfg.color }}>{dimActual}</span></p>
          </div>
        </div>
      </div>

      {/* MÉTRICAS CUÁNTICAS */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Factor φ', value: factor.toFixed(3), sub: 'Proporción Áurea', color: 'text-amber-400', border: 'border-amber-900/30' },
          { label: 'Ciclos Totales', value: String(cicloStats?.totalCiclos ?? 0), sub: 'eventos cuánticos', color: 'text-purple-400', border: 'border-purple-900/30' },
          { label: 'ΣΔ Cuántico', value: formatZC(cicloStats?.totalDelta ?? 0), sub: 'ZC generados', color: 'text-emerald-400', border: 'border-emerald-900/30' },
          { label: 'Factor Máx', value: Number(cicloStats?.maxFactor ?? PHI).toFixed(4), sub: 'φ^n alcanzado', color: 'text-sky-400', border: 'border-sky-900/30' },
          { label: 'Energía Σ', value: Number(cicloStats?.energiaTotal ?? 0).toFixed(2), sub: 'unidades cuánticas', color: 'text-red-400', border: 'border-red-900/30' },
        ].map(({ label, value, sub, color, border }) => (
          <div key={label} className={`card ${border} bg-[#0a1525] text-center`}>
            <p className="text-[10px] text-[#3d6485] uppercase tracking-wider">{label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${color}`}>{loading ? '—' : value}</p>
            <p className="text-[10px] text-[#3d6485] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* TABS: CICLOS CUÁNTICOS / HISTORIAL */}
      <div>
        <div className="flex gap-1 mb-4 border-b border-[#1a3350]">
          {(['cuantico', 'historial'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${activeTab === t ? 'text-[#e2f0ff] border-purple-500' : 'text-[#3d6485] border-transparent hover:text-[#7aa8cc]'}`}>
              {t === 'cuantico' ? '⚛ Ciclos Cuánticos' : '📊 Expansión Clásica'}
            </button>
          ))}
        </div>

        {activeTab === 'cuantico' && (
          <div className="space-y-4">
            {/* GRÁFICO */}
            {chartData.length > 1 && (
              <div className="card">
                <p className="text-xs text-[#7aa8cc] mb-3 flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Evolución Cuántica — Δ ZC por Ciclo</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a3350" />
                    <XAxis dataKey="label" tick={{ fill: '#3d6485', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#3d6485', fontSize: 10 }} axisLine={false} tickLine={false} width={60} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f2035', border: '1px solid #1a3350', borderRadius: '8px', color: '#e2f0ff' }}
                      formatter={(v: number) => [`${formatZC(v)} ZC`, 'Δ emitido']} />
                    <Area type="monotone" dataKey="delta" stroke="#8b5cf6" strokeWidth={2} fill="url(#qGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* GRID CICLOS */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#e2f0ff] flex items-center gap-2">
                  <Atom className="w-4 h-4 text-purple-400" /> Registro de Ciclos Cuánticos
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => firarCuantico(3)} disabled={firandoCuantico} className="text-xs px-3 py-1 rounded-lg bg-purple-900/30 hover:bg-purple-800/40 text-purple-400 border border-purple-800/40 transition-colors disabled:opacity-50">
                    {firandoCuantico ? '⚛ Evolucionando...' : '⚛ +3 Ciclos'}
                  </button>
                </div>
              </div>
              {ciclos.length === 0 ? (
                <div className="text-center py-12 text-[#3d6485]">
                  <Atom className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Sin ciclos cuánticos — activa el motor soberano</p>
                  <button onClick={() => firarCuantico(5)} className="mt-4 btn-gold flex items-center gap-2 mx-auto"><Zap className="w-4 h-4" /> Iniciar 5 Ciclos</button>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {ciclos.map(c => {
                    const cfg = DIMENSIONES_CONFIG[c.dimension] || DIMENSIONES_CONFIG.TEMPORAL;
                    return (
                      <div key={c.id} className={`flex items-center gap-4 p-3 rounded-lg border ${cfg.border} ${cfg.bg} transition-all`}>
                        <span className="text-xl shrink-0">{cfg.simbolo}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold" style={{ color: cfg.color }}>C{String(c.cicloNumero).padStart(4,'0')}</span>
                            <span className="text-[10px] font-mono text-[#7aa8cc]">{c.dimension}</span>
                            <span className="text-[10px] font-mono text-[#3d6485]">φ^{Number(c.factorAplicado).toFixed(4)}</span>
                          </div>
                          <p className="text-[10px] text-[#3d6485] mt-0.5">{formatDate(c.timestamp)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold font-mono" style={{ color: cfg.color }}>+{formatZC(c.delta)} ZC</p>
                          <p className="text-[10px] font-mono text-[#3d6485]">E: {Number(c.energiaCuantica).toFixed(3)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#e2f0ff] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Registro Clásico de Expansión
              </h2>
              <span className="text-xs font-mono text-[#3d6485]">{historial.length} entradas</span>
            </div>
            {historial.length === 0 ? (
              <div className="text-center py-12 text-[#3d6485]"><Infinity className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Sin expansiones clásicas</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-[#3d6485] text-xs uppercase tracking-wider border-b border-[#1a3350]">
                    <th className="text-left pb-3 pr-4">#</th><th className="text-left pb-3 pr-4">Activo</th>
                    <th className="text-right pb-3 pr-4">Valor Base</th><th className="text-right pb-3 pr-4">Δ (×φ)</th>
                    <th className="text-right pb-3 pr-4">Acumulado</th><th className="text-left pb-3">Timestamp</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#1a3350]">
                    {historial.map((h, idx) => (
                      <tr key={h.id} className="hover:bg-[#0d1b2e] transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-[#3d6485]">{String(historial.length - idx).padStart(3, '0')}</td>
                        <td className="py-3 pr-4"><span className="font-mono text-xs text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">{h.nombreActivo}</span></td>
                        <td className="py-3 pr-4 text-right font-mono text-[#7aa8cc]">{formatZC(h.valorActivo)} ZC</td>
                        <td className="py-3 pr-4 text-right font-mono text-emerald-400 font-semibold">+{formatZC(h.deltaEmitido)} ZC</td>
                        <td className="py-3 pr-4 text-right font-mono text-amber-400 font-bold">{formatZC(h.totalAcumulado)} ZC</td>
                        <td className="py-3 text-xs text-[#3d6485]">{formatDate(h.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL EXPANSIÓN CLÁSICA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg border-amber-900/50">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Activar Expansión Clásica</h2></div>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-[#3d6485]" /></button>
            </div>
            <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 mb-4 text-xs font-mono text-amber-400/80">
              ⚡ El trigger <span className="text-amber-400">gatillo_expansion_infinita</span> se disparará → banco ×φ ({factor})
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Nombre del Activo</label>
                <input className="input font-mono" placeholder="ACTIVO_SOBERANO" value={form.nombreActivo} onChange={e => setForm(f => ({ ...f, nombreActivo: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Valor en ZC</label>
                  <input className="input font-mono" type="number" placeholder="10000" value={form.valorZircoin} onChange={e => setForm(f => ({ ...f, valorZircoin: e.target.value }))} />
                  {form.valorZircoin && <p className="text-[10px] text-emerald-400 font-mono mt-1">→ +{formatZC(Number(form.valorZircoin) * factor)} ZC</p>}
                </div>
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Categoría</label>
                  <select className="select" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Descripción</label>
                <input className="input" placeholder="Descripción soberana..." value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={activarExpansion} disabled={saving || !form.nombreActivo || !form.valorZircoin} className="btn-gold flex items-center gap-2 disabled:opacity-50">
                <Zap className="w-4 h-4" />{saving ? 'Materializando...' : 'Materializar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
