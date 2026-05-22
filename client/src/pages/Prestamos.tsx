import { useEffect, useState, useCallback } from 'react';
import { api, CuentaSoberana, formatZC, formatDate } from '../lib/api';
import {
  Banknote, Plus, CreditCard, CheckCircle2, AlertCircle, X,
  Clock, TrendingDown, DollarSign, RefreshCw
} from 'lucide-react';

interface Prestamo {
  id: number;
  montoPrincipal: string;
  montoRestante: string;
  tasaInteres: string;
  plazo: number;
  estado: string;
  proposito: string | null;
  totalPagado: string;
  totalIntereses: string;
  fechaOtorgamiento: string;
  fechaVencimiento: string;
  idCuentaDeudor: number;
  titularDeudor: string | null;
  numeroCuentaDeudor: string | null;
}

interface PagoItem {
  id: number;
  monto: string;
  montoCapital: string | null;
  montoInteres: string | null;
  saldoRestante: string | null;
  concepto: string | null;
  timestamp: string;
}

interface Stats {
  totalPrestamos: number;
  totalPrincipal: number;
  prestamosActivos: number;
  totalRestante: number;
  prestamosPagados: number;
  totalInteresesGenerados: number;
  prestamosVencidos: number;
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    ACTIVO: 'text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-800/50',
    PAGADO: 'text-xs px-2 py-0.5 rounded-full bg-sky-900/50 text-sky-400 border border-sky-800/50',
    VENCIDO: 'text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800/50',
  };
  return <span className={map[estado] || 'text-xs px-2 py-0.5 rounded-full bg-[#1a3350] text-[#7aa8cc]'}>{estado}</span>;
}

function diasRestantes(fechaVencimiento: string): number {
  return Math.ceil((new Date(fechaVencimiento).getTime() - Date.now()) / 86400000);
}

export default function Prestamos() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cuentas, setCuentas] = useState<CuentaSoberana[]>([]);
  const [seleccionado, setSeleccionado] = useState<Prestamo | null>(null);
  const [pagos, setPagos] = useState<PagoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState<'crear' | 'pagar' | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCrear, setFormCrear] = useState({ idCuentaDeudor: '', montoPrincipal: '', plazo: '30', proposito: '' });
  const [formPagar, setFormPagar] = useState({ monto: '', idCuentaPagadora: '' });

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, s, c] = await Promise.all([api.prestamos.list(), api.prestamos.stats(), api.cuentas.list()]);
      setPrestamos(p);
      setStats(s);
      setCuentas(c.filter((x: CuentaSoberana) => x.estado === 'ACTIVA'));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function verPagos(p: Prestamo) {
    setSeleccionado(p);
    const lista = await api.prestamos.pagos(p.id);
    setPagos(lista);
  }

  async function crearPrestamo() {
    if (!formCrear.idCuentaDeudor || !formCrear.montoPrincipal) return;
    setSaving(true); setError('');
    try {
      await api.prestamos.crear({ idCuentaDeudor: Number(formCrear.idCuentaDeudor), montoPrincipal: Number(formCrear.montoPrincipal), plazo: Number(formCrear.plazo), proposito: formCrear.proposito });
      setSuccess(`Préstamo de ${formatZC(formCrear.montoPrincipal)} ZC otorgado`);
      setModal(null); setFormCrear({ idCuentaDeudor: '', montoPrincipal: '', plazo: '30', proposito: '' });
      setTimeout(() => setSuccess(''), 4000);
      cargar(true);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function pagarPrestamo() {
    if (!seleccionado || !formPagar.monto) return;
    setSaving(true); setError('');
    try {
      await api.prestamos.pagar(seleccionado.id, { monto: Number(formPagar.monto), idCuentaPagadora: formPagar.idCuentaPagadora ? Number(formPagar.idCuentaPagadora) : undefined });
      setSuccess(`Pago de ${formatZC(formPagar.monto)} ZC registrado`);
      setModal(null); setFormPagar({ monto: '', idCuentaPagadora: '' });
      setTimeout(() => setSuccess(''), 4000);
      await cargar(true);
      if (seleccionado) {
        const actualizado = prestamos.find(p => p.id === seleccionado.id);
        if (actualizado) await verPagos(actualizado);
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const activos = prestamos.filter(p => p.estado === 'ACTIVO');
  const vencidos = prestamos.filter(p => p.estado === 'VENCIDO');
  const pagados = prestamos.filter(p => p.estado === 'PAGADO');

  return (
    <div className="flex h-full overflow-hidden">
      {/* LISTA */}
      <div className="w-80 border-r border-[#1a3350] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#1a3350] flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-[#e2f0ff]">Préstamos Soberanos</h1>
            <p className="text-xs text-[#3d6485] mt-0.5">Tasa φ 1.618 · {stats?.prestamosActivos ?? 0} activos</p>
          </div>
          <button onClick={() => setModal('crear')} className="btn-gold flex items-center gap-1 text-xs px-3 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Otorgar
          </button>
        </div>

        {/* MÉTRICAS */}
        <div className="p-3 border-b border-[#1a3350] grid grid-cols-2 gap-2">
          <div className="bg-[#0a1525] rounded-lg p-2.5 border border-[#1a3350]">
            <p className="text-[10px] text-[#3d6485] uppercase tracking-wider">Cartera Activa</p>
            <p className="text-sm font-bold text-amber-400 font-mono mt-0.5">{formatZC(stats?.totalRestante ?? 0)}</p>
            <p className="text-[10px] text-[#3d6485]">ZC por cobrar</p>
          </div>
          <div className={`bg-[#0a1525] rounded-lg p-2.5 border ${(stats?.prestamosVencidos ?? 0) > 0 ? 'border-red-900/50' : 'border-[#1a3350]'}`}>
            <p className="text-[10px] text-[#3d6485] uppercase tracking-wider">Intereses φ</p>
            <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{formatZC(stats?.totalInteresesGenerados ?? 0)}</p>
            <p className="text-[10px] text-[#3d6485]">ZC generados</p>
          </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-[#0a1525] rounded-lg animate-pulse" />) : (
            <>
              {vencidos.length > 0 && (
                <p className="text-[10px] font-mono text-red-400 px-1 pt-1 uppercase tracking-widest">⚠ Vencidos ({vencidos.length})</p>
              )}
              {[...vencidos, ...activos, ...pagados].map(p => {
                const dias = diasRestantes(p.fechaVencimiento);
                const pct = Math.max(0, Math.min(100, (Number(p.totalPagado) / Number(p.montoPrincipal)) * 100));
                return (
                  <button key={p.id} onClick={() => verPagos(p)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${seleccionado?.id === p.id ? 'bg-sky-950/30 border-sky-800/50' : p.estado === 'VENCIDO' ? 'bg-red-950/10 border-red-900/30 hover:border-red-800/50' : 'bg-[#0a1525] border-[#1a3350] hover:border-[#2a4a6e]'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#e2f0ff] truncate">{p.titularDeudor}</p>
                        <p className="text-[10px] font-mono text-[#3d6485]">#{p.id} · {p.plazo}d</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-mono text-amber-400">{formatZC(p.montoRestante)}</p>
                        <EstadoBadge estado={p.estado} />
                      </div>
                    </div>
                    <div className="w-full bg-[#0d1b2e] rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-sky-600 to-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#3d6485]">{pct.toFixed(0)}% pagado</span>
                      <span className={`text-[10px] font-mono ${dias < 0 ? 'text-red-400' : dias < 7 ? 'text-amber-400' : 'text-[#3d6485]'}`}>
                        {dias < 0 ? `vencido hace ${Math.abs(dias)}d` : `${dias}d restantes`}
                      </span>
                    </div>
                  </button>
                );
              })}
              {prestamos.length === 0 && (
                <div className="text-center py-10 text-[#3d6485]">
                  <Banknote className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Sin préstamos emitidos</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* PANEL DETALLE */}
      <div className="flex-1 overflow-y-auto">
        {error && <div className="m-4 card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{error}<button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button></div>}
        {success && <div className="m-4 card border-emerald-800/50 bg-emerald-950/20 flex items-center gap-3 text-emerald-400 text-sm font-mono"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}

        {!seleccionado ? (
          <div className="flex flex-col items-center justify-center h-full text-[#3d6485]">
            <CreditCard className="w-12 h-12 mb-4 opacity-10" />
            <p className="text-sm">Selecciona un préstamo para ver sus pagos</p>
            <button onClick={() => setModal('crear')} className="btn-gold mt-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Otorgar primer préstamo</button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="card border-[#2a4a6e] bg-gradient-to-r from-[#0a1525] to-[#0f2035]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <EstadoBadge estado={seleccionado.estado} />
                    <span className="text-xs font-mono text-[#3d6485]">#{seleccionado.id} · φ {seleccionado.tasaInteres}</span>
                  </div>
                  <h2 className="text-lg font-bold text-[#e2f0ff]">{seleccionado.titularDeudor}</h2>
                  <p className="text-xs font-mono text-[#3d6485]">{seleccionado.numeroCuentaDeudor}</p>
                  {seleccionado.proposito && <p className="text-xs text-[#7aa8cc] mt-1">{seleccionado.proposito}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#7aa8cc] mb-1">Restante</p>
                  <p className="text-3xl font-bold font-mono text-amber-400">{formatZC(seleccionado.montoRestante)}</p>
                  <p className="text-xs text-[#3d6485] mt-0.5">de {formatZC(seleccionado.montoPrincipal)} ZC principal</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { label: 'Pagado', value: `${formatZC(seleccionado.totalPagado)} ZC`, color: 'text-emerald-400' },
                  { label: 'Intereses φ', value: `${formatZC(seleccionado.totalIntereses)} ZC`, color: 'text-sky-400' },
                  { label: 'Plazo', value: `${seleccionado.plazo} días`, color: 'text-[#7aa8cc]' },
                  { label: 'Vence', value: formatDate(seleccionado.fechaVencimiento).split(',')[0], color: diasRestantes(seleccionado.fechaVencimiento) < 0 ? 'text-red-400' : 'text-[#7aa8cc]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#0a1525] rounded-lg p-2.5 border border-[#1a3350]">
                    <p className="text-[10px] text-[#3d6485] uppercase tracking-wider">{label}</p>
                    <p className={`text-sm font-bold font-mono mt-0.5 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* PROGRESO */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-[#3d6485] mb-1">
                  <span>Progreso de pago</span>
                  <span>{((Number(seleccionado.totalPagado) / Number(seleccionado.montoPrincipal)) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-[#0d1b2e] rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-sky-600 to-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, (Number(seleccionado.totalPagado) / Number(seleccionado.montoPrincipal)) * 100)}%` }} />
                </div>
              </div>

              {seleccionado.estado === 'ACTIVO' && (
                <div className="mt-4 pt-4 border-t border-[#1a3350]">
                  <button onClick={() => setModal('pagar')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 text-sm border border-emerald-800/50 transition-colors">
                    <DollarSign className="w-4 h-4" /> Registrar Pago
                  </button>
                </div>
              )}
            </div>

            {/* HISTORIAL DE PAGOS */}
            <div className="card">
              <h3 className="text-sm font-semibold text-[#e2f0ff] mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#7aa8cc]" /> Historial de Pagos
              </h3>
              {pagos.length === 0 ? (
                <div className="text-center py-8 text-[#3d6485] text-sm">Sin pagos registrados</div>
              ) : (
                <div className="space-y-2">
                  {pagos.map(p => (
                    <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg bg-[#0a1525] border border-[#1a3350]">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#e2f0ff] font-medium">{p.concepto}</p>
                        <p className="text-[10px] text-[#3d6485] mt-0.5">{formatDate(p.timestamp)}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="font-mono text-sm font-bold text-emerald-400">+{formatZC(p.monto)} ZC</p>
                        <p className="text-[10px] font-mono text-sky-400">Interés: {formatZC(p.montoInteres ?? 0)} ZC</p>
                        <p className="text-[10px] font-mono text-[#3d6485]">Saldo: {formatZC(p.saldoRestante ?? 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODALES */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md border-amber-900/40">
            {modal === 'crear' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><Banknote className="w-5 h-5 text-amber-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Otorgar Préstamo Soberano</h2></div>
                  <button onClick={() => setModal(null)} className="text-[#3d6485] hover:text-[#e2f0ff]"><X className="w-5 h-5" /></button>
                </div>
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 mb-4 text-xs font-mono text-amber-400/80">
                  ⚡ Tasa de interés φ = 1.618 — Los intereses se calculan automáticamente por cada pago
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Cuenta Deudor</label>
                    <select className="select" value={formCrear.idCuentaDeudor} onChange={e => setFormCrear(f => ({ ...f, idCuentaDeudor: e.target.value }))}>
                      <option value="">— Seleccionar titular —</option>
                      {cuentas.map(c => <option key={c.id} value={c.id}>{c.titular} — {formatZC(c.saldo)} ZC disponibles</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#7aa8cc] block mb-1">Monto Principal (ZC)</label>
                      <input className="input font-mono" type="number" placeholder="10000" value={formCrear.montoPrincipal} onChange={e => setFormCrear(f => ({ ...f, montoPrincipal: e.target.value }))} />
                      {formCrear.montoPrincipal && <p className="text-[10px] text-amber-400 font-mono mt-1">Intereses totales ≈ {formatZC(Number(formCrear.montoPrincipal) * 0.618)} ZC</p>}
                    </div>
                    <div>
                      <label className="text-xs text-[#7aa8cc] block mb-1">Plazo (días)</label>
                      <input className="input font-mono" type="number" placeholder="30" value={formCrear.plazo} onChange={e => setFormCrear(f => ({ ...f, plazo: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Propósito</label>
                    <input className="input" placeholder="Financiamiento soberano..." value={formCrear.proposito} onChange={e => setFormCrear(f => ({ ...f, proposito: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={crearPrestamo} disabled={saving || !formCrear.idCuentaDeudor || !formCrear.montoPrincipal} className="btn-gold flex items-center gap-2 disabled:opacity-50">
                    <Banknote className="w-4 h-4" />{saving ? 'Otorgando...' : 'Otorgar Préstamo'}
                  </button>
                </div>
              </>
            )}
            {modal === 'pagar' && seleccionado && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Registrar Pago</h2></div>
                  <button onClick={() => setModal(null)} className="text-[#3d6485] hover:text-[#e2f0ff]"><X className="w-5 h-5" /></button>
                </div>
                <div className="bg-[#0a1525] rounded-lg p-3 mb-4 border border-[#1a3350] text-xs font-mono text-[#7aa8cc]">
                  Saldo restante: <span className="text-amber-400">{formatZC(seleccionado.montoRestante)} ZC</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Monto del Pago (ZC)</label>
                    <input className="input font-mono text-lg" type="number" placeholder="1000" value={formPagar.monto} onChange={e => setFormPagar(f => ({ ...f, monto: e.target.value }))} />
                    {formPagar.monto && <p className="text-[10px] text-sky-400 font-mono mt-1">Interés φ incluido: {formatZC(Number(formPagar.monto) * 0.618)} ZC</p>}
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Cargo desde cuenta (opcional)</label>
                    <select className="select" value={formPagar.idCuentaPagadora} onChange={e => setFormPagar(f => ({ ...f, idCuentaPagadora: e.target.value }))}>
                      <option value="">— Pago externo —</option>
                      {cuentas.map(c => <option key={c.id} value={c.id}>{c.titular} — {formatZC(c.saldo)} ZC</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={pagarPrestamo} disabled={saving || !formPagar.monto} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50">
                    <CheckCircle2 className="w-4 h-4" />{saving ? 'Procesando...' : 'Confirmar Pago'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
