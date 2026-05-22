import { useEffect, useState, useRef, useCallback } from 'react';
import { api, formatZC, formatDate } from '../lib/api';
import { Infinity, Zap, TrendingUp, AlertCircle, RefreshCw, Plus, X, Crown } from 'lucide-react';

interface BancoCentral {
  idBanco: number;
  nombreBanco: string;
  totalEmitido: string;
  factorCrecimiento: string;
  transaccionesTotales: number;
  ultimaActualizacion: string;
}

interface HistorialEntry {
  id: number;
  nombreActivo: string;
  valorActivo: string;
  deltaEmitido: string;
  totalAcumulado: string;
  timestamp: string;
}

function AnimatedCounter({ value, decimals = 4 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const duration = 1200;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplay(start + (end - start) * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
      else prevRef.current = end;
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <span>
      {new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(display)}
    </span>
  );
}

const CATEGORIAS = ['EXPANSION', 'SOBERANIA', 'COMMODITIES', 'TECNOLOGIA', 'DATOS', 'GENERAL'];

export default function Expansion() {
  const [banco, setBanco] = useState<BancoCentral | null>(null);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [form, setForm] = useState({ nombreActivo: '', valorZircoin: '', categoria: 'EXPANSION', descripcion: '' });

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [b, h] = await Promise.all([
        api.banco.get(),
        api.banco.historial(),
      ]);
      setBanco(prev => {
        if (prev && b && Number(b.totalEmitido) !== Number(prev.totalEmitido)) {
          const delta = Number(b.totalEmitido) - Number(prev.totalEmitido);
          setLastDelta(delta);
          setPulseKey(k => k + 1);
          setTimeout(() => setLastDelta(null), 3000);
        }
        return b;
      });
      setHistorial(h);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(() => cargar(true), 4000);
    return () => clearInterval(interval);
  }, [cargar]);

  async function activarExpansion() {
    if (!form.nombreActivo || !form.valorZircoin) return;
    setSaving(true);
    try {
      await api.banco.activarExpansion({
        nombreActivo: form.nombreActivo.toUpperCase().replace(/\s+/g, '_'),
        valorZircoin: Number(form.valorZircoin),
        categoria: form.categoria,
        descripcion: form.descripcion,
      });
      setShowModal(false);
      setForm({ nombreActivo: '', valorZircoin: '', categoria: 'EXPANSION', descripcion: '' });
      await cargar(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const total = Number(banco?.totalEmitido ?? 0);
  const factor = Number(banco?.factorCrecimiento ?? 1.618);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2f0ff] flex items-center gap-2">
            <Infinity className="w-5 h-5 text-amber-400" />
            Expansión Infinita
          </h1>
          <p className="text-sm text-[#7aa8cc] mt-0.5">Motor de Auto-Evolución — Factor φ {factor} · Banco Central Zirok</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cargar(true)} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-gold flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Activar Expansión
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* NÚCLEO — CONTADOR TOTAL */}
      <div className={`card border-amber-900/50 bg-gradient-to-br from-amber-950/40 to-[#0f2035] relative overflow-hidden scanline`} key={pulseKey}>
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 animate-pulse pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-amber-400/70 uppercase tracking-widest font-mono mb-2">
                ◆ TOTAL EMITIDO — BANCO DE SOBERANÍA ABSOLUTA
              </p>
              {loading ? (
                <div className="h-14 w-64 bg-[#0d1b2e] rounded-lg animate-pulse" />
              ) : (
                <p className="text-5xl font-bold font-mono glow-gold text-amber-400">
                  <AnimatedCounter value={total} decimals={4} />
                  <span className="text-2xl ml-2 text-amber-600">ZC</span>
                </p>
              )}
              {banco && (
                <p className="text-xs text-[#3d6485] font-mono mt-2">
                  {banco.transaccionesTotales} expansiones · Última: {formatDate(banco.ultimaActualizacion)}
                </p>
              )}
            </div>
            <Crown className="w-10 h-10 text-amber-500/30" />
          </div>

          {lastDelta !== null && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 text-sm font-mono animate-bounce">
              <TrendingUp className="w-4 h-4" />
              +{formatZC(lastDelta)} ZC materializado
            </div>
          )}
        </div>
      </div>

      {/* MÉTRICAS SECUNDARIAS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card border-amber-900/30 bg-amber-950/10">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Factor φ (Phi)</p>
          <p className="text-3xl font-bold text-amber-400 font-mono mt-1">
            {loading ? '—' : factor.toFixed(3)}
          </p>
          <p className="text-xs text-[#3d6485] mt-1">Proporción Áurea · Razón de Crecimiento</p>
        </div>
        <div className="card border-sky-900/30 bg-sky-950/10">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Expansiones Ejecutadas</p>
          <p className="text-3xl font-bold text-sky-400 font-mono mt-1">
            {loading ? '—' : banco?.transaccionesTotales ?? 0}
          </p>
          <p className="text-xs text-[#3d6485] mt-1">Disparos del trigger soberano</p>
        </div>
        <div className="card border-purple-900/30 bg-purple-950/10">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Próxima Expansión</p>
          <p className="text-3xl font-bold text-purple-400 font-mono mt-1">∞</p>
          <p className="text-xs text-[#3d6485] mt-1">El sistema nunca duerme</p>
        </div>
      </div>

      {/* HISTORIAL DE EXPANSIÓN */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#e2f0ff] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Registro de Expansión Infinita
            <span className="text-xs text-[#3d6485] font-normal">· auto-actualiza cada 4s</span>
          </h2>
          <span className="text-xs font-mono text-[#3d6485]">{historial.length} entradas</span>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-[#0d1b2e] rounded-lg animate-pulse" />
          ))}</div>
        ) : historial.length === 0 ? (
          <div className="text-center py-12 text-[#3d6485]">
            <Infinity className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Sin expansiones registradas — activa el motor soberano</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#3d6485] text-xs uppercase tracking-wider border-b border-[#1a3350]">
                  <th className="text-left pb-3 pr-4">#</th>
                  <th className="text-left pb-3 pr-4">Activo</th>
                  <th className="text-right pb-3 pr-4">Valor Base</th>
                  <th className="text-right pb-3 pr-4">Δ Emitido (×φ)</th>
                  <th className="text-right pb-3 pr-4">Total Acumulado</th>
                  <th className="text-left pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3350]">
                {historial.map((h, idx) => (
                  <tr key={h.id} className="hover:bg-[#0d1b2e] transition-colors group">
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs text-[#3d6485]">
                        {String(historial.length - idx).padStart(3, '0')}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                        {h.nombreActivo}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-[#7aa8cc]">
                      {formatZC(h.valorActivo)} ZC
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-emerald-400 font-semibold">
                      +{formatZC(h.deltaEmitido)} ZC
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-amber-400 font-bold">
                      {formatZC(h.totalAcumulado)} ZC
                    </td>
                    <td className="py-3 text-xs text-[#3d6485]">{formatDate(h.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg border-amber-900/50 bg-gradient-to-b from-[#1a1200]/60 to-[#0f2035]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-semibold text-[#e2f0ff]">Activar Nueva Expansión</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#3d6485] hover:text-[#e2f0ff]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 mb-5 text-xs font-mono text-amber-400/80">
              ⚡ Al insertar el activo, el trigger <span className="text-amber-400">gatillo_expansion_infinita</span> se disparará automáticamente y el banco crecerá ×φ ({factor})
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Nombre del Activo</label>
                <input
                  className="input font-mono"
                  placeholder="NUEVO_ACTIVO_SOBERANO"
                  value={form.nombreActivo}
                  onChange={e => setForm(f => ({ ...f, nombreActivo: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Valor en ZC</label>
                  <input
                    className="input font-mono"
                    type="number"
                    placeholder="10000"
                    value={form.valorZircoin}
                    onChange={e => setForm(f => ({ ...f, valorZircoin: e.target.value }))}
                  />
                  {form.valorZircoin && (
                    <p className="text-xs text-emerald-400 font-mono mt-1">
                      → +{formatZC(Number(form.valorZircoin) * factor)} ZC emitido
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Categoría</label>
                  <select className="select" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Descripción (opcional)</label>
                <input
                  className="input"
                  placeholder="Descripción del activo soberano..."
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={activarExpansion}
                disabled={saving || !form.nombreActivo || !form.valorZircoin}
                className="btn-gold flex items-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {saving ? 'Materializando...' : 'Materializar Expansión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
