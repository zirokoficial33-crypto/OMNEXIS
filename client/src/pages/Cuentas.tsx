import { useEffect, useState, useCallback } from 'react';
import { api, CuentaSoberana, OperacionCuenta, formatZC, formatDate } from '../lib/api';
import {
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft,
  AlertCircle, X, CheckCircle2, ChevronRight, Lock, Unlock, Eye
} from 'lucide-react';

const TIPOS = ['PERSONAL', 'CORPORATIVA', 'SOBERANA', 'RESERVA'];

function TipoBadge({ tipo }: { tipo: string }) {
  const cls =
    tipo === 'SOBERANA' ? 'text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-800/50' :
    tipo === 'CORPORATIVA' ? 'text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-400 border border-purple-800/50' :
    tipo === 'RESERVA' ? 'text-xs px-2 py-0.5 rounded-full bg-sky-900/50 text-sky-400 border border-sky-800/50' :
    'text-xs px-2 py-0.5 rounded-full bg-[#1a3350] text-[#7aa8cc] border border-[#2a4a6e]';
  return <span className={cls}>{tipo}</span>;
}

function EstadoDot({ estado }: { estado: string }) {
  const color = estado === 'ACTIVA' ? 'bg-emerald-400' : estado === 'SUSPENDIDA' ? 'bg-amber-400' : 'bg-red-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function OpTipo({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; color: string; Icon: any }> = {
    DEPOSITO: { label: 'Depósito', color: 'text-emerald-400', Icon: ArrowDownLeft },
    RETIRO: { label: 'Retiro', color: 'text-red-400', Icon: ArrowUpRight },
    TRANSFERENCIA_SALIDA: { label: 'Enviado', color: 'text-red-400', Icon: ArrowUpRight },
    TRANSFERENCIA_ENTRADA: { label: 'Recibido', color: 'text-emerald-400', Icon: ArrowDownLeft },
    APERTURA: { label: 'Apertura', color: 'text-sky-400', Icon: Wallet },
  };
  const { label, color, Icon } = map[tipo] || { label: tipo, color: 'text-[#7aa8cc]', Icon: ArrowRightLeft };
  return (
    <span className={`flex items-center gap-1 ${color} text-xs font-medium`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

type ModalType = 'crear' | 'depositar' | 'retirar' | 'transferir' | null;

export default function Cuentas() {
  const [cuentas, setCuentas] = useState<CuentaSoberana[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaSoberana | null>(null);
  const [operaciones, setOperaciones] = useState<OperacionCuenta[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);

  const [formCrear, setFormCrear] = useState({ titular: '', tipo: 'PERSONAL', saldoInicial: '' });
  const [formDepositar, setFormDepositar] = useState({ monto: '', descripcion: '' });
  const [formRetirar, setFormRetirar] = useState({ monto: '', descripcion: '' });
  const [formTransferir, setFormTransferir] = useState({ numeroCuentaOrigen: '', numeroCuentaDestino: '', monto: '', descripcion: '' });

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [c, s] = await Promise.all([api.cuentas.list(), api.cuentas.stats()]);
      setCuentas(c);
      setStats(s);
      if (cuentaSeleccionada) {
        const actualizada = c.find(x => x.id === cuentaSeleccionada.id);
        if (actualizada) setCuentaSeleccionada(actualizada);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [cuentaSeleccionada?.id]);

  useEffect(() => { cargar(); }, []);

  async function verCuenta(c: CuentaSoberana) {
    setCuentaSeleccionada(c);
    setLoadingOps(true);
    try {
      const ops = await api.cuentas.operaciones(c.id);
      setOperaciones(ops);
    } catch { setOperaciones([]); }
    finally { setLoadingOps(false); }
  }

  function ok(msg: string) {
    setSuccess(msg);
    setModal(null);
    setFormCrear({ titular: '', tipo: 'PERSONAL', saldoInicial: '' });
    setFormDepositar({ monto: '', descripcion: '' });
    setFormRetirar({ monto: '', descripcion: '' });
    setFormTransferir({ numeroCuentaOrigen: '', numeroCuentaDestino: '', monto: '', descripcion: '' });
    setTimeout(() => setSuccess(''), 5000);
    cargar(true);
  }

  async function crearCuenta() {
    if (!formCrear.titular) return;
    setSaving(true);
    try {
      const c = await api.cuentas.crear({ titular: formCrear.titular, tipo: formCrear.tipo, saldoInicial: formCrear.saldoInicial ? Number(formCrear.saldoInicial) : undefined });
      ok(`Cuenta ${c.numeroCuenta} abierta para ${c.titular}`);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function depositar() {
    if (!formDepositar.monto || !cuentaSeleccionada) return;
    setSaving(true);
    try {
      await api.cuentas.depositar(cuentaSeleccionada.id, { monto: Number(formDepositar.monto), descripcion: formDepositar.descripcion });
      ok(`+${formatZC(formDepositar.monto)} ZC depositados en ${cuentaSeleccionada.numeroCuenta}`);
      const ops = await api.cuentas.operaciones(cuentaSeleccionada.id);
      setOperaciones(ops);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function retirar() {
    if (!formRetirar.monto || !cuentaSeleccionada) return;
    setSaving(true);
    try {
      await api.cuentas.retirar(cuentaSeleccionada.id, { monto: Number(formRetirar.monto), descripcion: formRetirar.descripcion });
      ok(`-${formatZC(formRetirar.monto)} ZC retirados de ${cuentaSeleccionada.numeroCuenta}`);
      const ops = await api.cuentas.operaciones(cuentaSeleccionada.id);
      setOperaciones(ops);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function transferir() {
    const { numeroCuentaOrigen, numeroCuentaDestino, monto } = formTransferir;
    if (!numeroCuentaOrigen || !numeroCuentaDestino || !monto) return;
    setSaving(true);
    try {
      const r = await api.cuentas.transferir({ numeroCuentaOrigen, numeroCuentaDestino, monto: Number(monto), descripcion: formTransferir.descripcion });
      ok(`Transferencia REF ${r.referencia} — ${formatZC(r.monto)} ZC confirmada`);
      if (cuentaSeleccionada) {
        const ops = await api.cuentas.operaciones(cuentaSeleccionada.id);
        setOperaciones(ops);
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function cambiarEstado(c: CuentaSoberana, estado: string) {
    try {
      await api.cuentas.cambiarEstado(c.id, estado);
      cargar(true);
      if (cuentaSeleccionada?.id === c.id) setCuentaSeleccionada(prev => prev ? { ...prev, estado } : prev);
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* LISTA IZQUIERDA */}
      <div className="w-80 border-r border-[#1a3350] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#1a3350] flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-[#e2f0ff]">Cuentas Soberanas</h1>
            <p className="text-xs text-[#3d6485] mt-0.5">{stats?.cuentasActivas ?? 0} activas · {stats?.totalCuentas ?? 0} total</p>
          </div>
          <button onClick={() => setModal('crear')} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
        </div>

        {/* MÉTRICAS */}
        <div className="p-3 border-b border-[#1a3350] grid grid-cols-2 gap-2">
          <div className="bg-[#0a1525] rounded-lg p-2.5 border border-[#1a3350]">
            <p className="text-[10px] text-[#3d6485] uppercase tracking-wider">Circulando</p>
            <p className="text-sm font-bold text-amber-400 font-mono mt-0.5">{formatZC(stats?.saldoTotal ?? 0)}</p>
            <p className="text-[10px] text-[#3d6485]">ZC en cuentas</p>
          </div>
          <div className="bg-[#0a1525] rounded-lg p-2.5 border border-[#1a3350]">
            <p className="text-[10px] text-[#3d6485] uppercase tracking-wider">Operaciones</p>
            <p className="text-sm font-bold text-sky-400 font-mono mt-0.5">{stats?.totalOperaciones ?? 0}</p>
            <p className="text-[10px] text-[#3d6485]">registradas</p>
          </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-[#0a1525] rounded-lg animate-pulse" />)
          ) : cuentas.length === 0 ? (
            <div className="text-center py-10 text-[#3d6485]">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">Sin cuentas abiertas</p>
            </div>
          ) : (
            cuentas.map(c => (
              <button
                key={c.id}
                onClick={() => verCuenta(c)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  cuentaSeleccionada?.id === c.id
                    ? 'bg-sky-950/30 border-sky-800/50'
                    : 'bg-[#0a1525] border-[#1a3350] hover:border-[#2a4a6e]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <EstadoDot estado={c.estado} />
                      <span className="text-xs font-semibold text-[#e2f0ff] truncate">{c.titular}</span>
                    </div>
                    <p className="text-[10px] font-mono text-[#3d6485]">{c.numeroCuenta}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-mono text-amber-400">{formatZC(c.saldo)}</p>
                    <p className="text-[10px] text-[#3d6485]">ZC</p>
                  </div>
                </div>
                <div className="mt-1.5">
                  <TipoBadge tipo={c.tipo} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="m-4 card border-emerald-800/50 bg-emerald-950/20 flex items-center gap-3 text-emerald-400 text-sm font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {!cuentaSeleccionada ? (
          <div className="flex flex-col items-center justify-center h-full text-[#3d6485]">
            <Wallet className="w-12 h-12 mb-4 opacity-10" />
            <p className="text-sm">Selecciona una cuenta para ver su estado</p>
            <button onClick={() => setModal('crear')} className="btn-primary mt-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Abrir primera cuenta
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* CABECERA CUENTA */}
            <div className="card border-[#2a4a6e] bg-gradient-to-r from-[#0a1525] to-[#0f2035]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <EstadoDot estado={cuentaSeleccionada.estado} />
                    <span className="text-xs text-[#7aa8cc]">{cuentaSeleccionada.estado}</span>
                    <TipoBadge tipo={cuentaSeleccionada.tipo} />
                  </div>
                  <h2 className="text-lg font-bold text-[#e2f0ff]">{cuentaSeleccionada.titular}</h2>
                  <p className="text-xs font-mono text-[#3d6485] mt-0.5">{cuentaSeleccionada.numeroCuenta}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#7aa8cc] uppercase tracking-wider mb-1">Saldo Disponible</p>
                  <p className="text-3xl font-bold font-mono text-amber-400">{formatZC(cuentaSeleccionada.saldo)}</p>
                  <p className="text-xs text-[#3d6485] mt-0.5">ZC · Última op: {formatDate(cuentaSeleccionada.ultimaOperacion)}</p>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#1a3350] flex-wrap">
                <button
                  onClick={() => { setModal('depositar'); }}
                  disabled={cuentaSeleccionada.estado !== 'ACTIVA'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 text-sm border border-emerald-800/50 transition-colors disabled:opacity-30"
                >
                  <ArrowDownLeft className="w-4 h-4" /> Depositar
                </button>
                <button
                  onClick={() => { setModal('retirar'); }}
                  disabled={cuentaSeleccionada.estado !== 'ACTIVA'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-800/40 text-red-400 text-sm border border-red-800/50 transition-colors disabled:opacity-30"
                >
                  <ArrowUpRight className="w-4 h-4" /> Retirar
                </button>
                <button
                  onClick={() => { setFormTransferir(f => ({ ...f, numeroCuentaOrigen: cuentaSeleccionada.numeroCuenta })); setModal('transferir'); }}
                  disabled={cuentaSeleccionada.estado !== 'ACTIVA'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-900/30 hover:bg-sky-800/40 text-sky-400 text-sm border border-sky-800/50 transition-colors disabled:opacity-30"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Transferir
                </button>
                <div className="ml-auto flex items-center gap-2">
                  {cuentaSeleccionada.estado === 'ACTIVA' ? (
                    <button onClick={() => cambiarEstado(cuentaSeleccionada, 'SUSPENDIDA')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/20 hover:bg-amber-900/40 text-amber-400 text-xs border border-amber-800/40 transition-colors">
                      <Lock className="w-3.5 h-3.5" /> Suspender
                    </button>
                  ) : cuentaSeleccionada.estado === 'SUSPENDIDA' ? (
                    <button onClick={() => cambiarEstado(cuentaSeleccionada, 'ACTIVA')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 text-xs border border-emerald-800/40 transition-colors">
                      <Unlock className="w-3.5 h-3.5" /> Reactivar
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* OPERACIONES */}
            <div className="card">
              <h3 className="text-sm font-semibold text-[#e2f0ff] mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#7aa8cc]" />
                Estado de Cuenta
              </h3>
              {loadingOps ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-[#0d1b2e] rounded animate-pulse" />)}</div>
              ) : operaciones.length === 0 ? (
                <div className="text-center py-8 text-[#3d6485] text-sm">Sin operaciones registradas</div>
              ) : (
                <div className="space-y-1">
                  {operaciones.map(op => {
                    const esIngreso = op.tipo === 'DEPOSITO' || op.tipo === 'TRANSFERENCIA_ENTRADA' || op.tipo === 'APERTURA';
                    return (
                      <div key={op.id} className="flex items-center gap-4 p-3 rounded-lg bg-[#0a1525] border border-[#1a3350] hover:border-[#2a4a6e] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <OpTipo tipo={op.tipo} />
                            {op.cuentaContraparte && (
                              <span className="text-[10px] font-mono text-[#3d6485]">{op.cuentaContraparte}</span>
                            )}
                          </div>
                          <div className="text-xs text-[#3d6485]">
                            {op.descripcion} · {op.referencia}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-mono text-sm font-bold ${esIngreso ? 'text-emerald-400' : 'text-red-400'}`}>
                            {esIngreso ? '+' : '-'}{formatZC(op.monto)} ZC
                          </p>
                          <p className="text-[10px] text-[#3d6485] font-mono">→ {formatZC(op.saldoResultante ?? 0)}</p>
                          <p className="text-[10px] text-[#3d6485]">{formatDate(op.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALES ===== */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md border-[#2a4a6e]">

            {/* CREAR */}
            {modal === 'crear' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-sky-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Abrir Cuenta Soberana</h2></div>
                  <button onClick={() => setModal(null)} className="text-[#3d6485] hover:text-[#e2f0ff]"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Titular</label>
                    <input className="input" placeholder="Nombre del titular o entidad" value={formCrear.titular} onChange={e => setFormCrear(f => ({ ...f, titular: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#7aa8cc] block mb-1">Tipo de Cuenta</label>
                      <select className="select" value={formCrear.tipo} onChange={e => setFormCrear(f => ({ ...f, tipo: e.target.value }))}>
                        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#7aa8cc] block mb-1">Saldo Inicial (ZC)</label>
                      <input className="input font-mono" type="number" placeholder="0.00" value={formCrear.saldoInicial} onChange={e => setFormCrear(f => ({ ...f, saldoInicial: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={crearCuenta} disabled={saving || !formCrear.titular} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Plus className="w-4 h-4" />{saving ? 'Abriendo...' : 'Abrir Cuenta'}
                  </button>
                </div>
              </>
            )}

            {/* DEPOSITAR */}
            {modal === 'depositar' && cuentaSeleccionada && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><ArrowDownLeft className="w-5 h-5 text-emerald-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Depositar ZC</h2></div>
                  <button onClick={() => setModal(null)} className="text-[#3d6485] hover:text-[#e2f0ff]"><X className="w-5 h-5" /></button>
                </div>
                <div className="bg-[#0a1525] rounded-lg p-3 mb-4 border border-[#1a3350] text-xs font-mono text-[#7aa8cc]">
                  {cuentaSeleccionada.titular} · {cuentaSeleccionada.numeroCuenta}<br />
                  Saldo actual: <span className="text-amber-400">{formatZC(cuentaSeleccionada.saldo)} ZC</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Monto (ZC)</label>
                    <input className="input font-mono text-lg" type="number" placeholder="1000.00" value={formDepositar.monto} onChange={e => setFormDepositar(f => ({ ...f, monto: e.target.value }))} />
                    {formDepositar.monto && <p className="text-xs text-emerald-400 font-mono mt-1">Nuevo saldo → {formatZC(Number(cuentaSeleccionada.saldo) + Number(formDepositar.monto))} ZC</p>}
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Descripción (opcional)</label>
                    <input className="input" placeholder="Depósito soberano..." value={formDepositar.descripcion} onChange={e => setFormDepositar(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={depositar} disabled={saving || !formDepositar.monto} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50">
                    <ArrowDownLeft className="w-4 h-4" />{saving ? 'Procesando...' : 'Confirmar Depósito'}
                  </button>
                </div>
              </>
            )}

            {/* RETIRAR */}
            {modal === 'retirar' && cuentaSeleccionada && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-red-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Retirar ZC</h2></div>
                  <button onClick={() => setModal(null)} className="text-[#3d6485] hover:text-[#e2f0ff]"><X className="w-5 h-5" /></button>
                </div>
                <div className="bg-[#0a1525] rounded-lg p-3 mb-4 border border-[#1a3350] text-xs font-mono text-[#7aa8cc]">
                  {cuentaSeleccionada.titular} · {cuentaSeleccionada.numeroCuenta}<br />
                  Saldo disponible: <span className="text-amber-400">{formatZC(cuentaSeleccionada.saldo)} ZC</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Monto (ZC)</label>
                    <input className="input font-mono text-lg" type="number" placeholder="500.00" value={formRetirar.monto} onChange={e => setFormRetirar(f => ({ ...f, monto: e.target.value }))} />
                    {formRetirar.monto && Number(formRetirar.monto) > Number(cuentaSeleccionada.saldo) && (
                      <p className="text-xs text-red-400 font-mono mt-1">⚠ Monto supera el saldo disponible</p>
                    )}
                    {formRetirar.monto && Number(formRetirar.monto) <= Number(cuentaSeleccionada.saldo) && (
                      <p className="text-xs text-[#7aa8cc] font-mono mt-1">Saldo restante → {formatZC(Number(cuentaSeleccionada.saldo) - Number(formRetirar.monto))} ZC</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Descripción (opcional)</label>
                    <input className="input" placeholder="Retiro soberano..." value={formRetirar.descripcion} onChange={e => setFormRetirar(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={retirar} disabled={saving || !formRetirar.monto || Number(formRetirar.monto) > Number(cuentaSeleccionada.saldo)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                    <ArrowUpRight className="w-4 h-4" />{saving ? 'Procesando...' : 'Confirmar Retiro'}
                  </button>
                </div>
              </>
            )}

            {/* TRANSFERIR */}
            {modal === 'transferir' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-sky-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Transferencia entre Cuentas</h2></div>
                  <button onClick={() => setModal(null)} className="text-[#3d6485] hover:text-[#e2f0ff]"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#7aa8cc] block mb-1">Cuenta Origen</label>
                      <select className="select font-mono text-xs" value={formTransferir.numeroCuentaOrigen} onChange={e => setFormTransferir(f => ({ ...f, numeroCuentaOrigen: e.target.value }))}>
                        <option value="">— Seleccionar —</option>
                        {cuentas.filter(c => c.estado === 'ACTIVA').map(c => (
                          <option key={c.id} value={c.numeroCuenta}>{c.titular} ({formatZC(c.saldo)} ZC)</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#7aa8cc] block mb-1">Cuenta Destino</label>
                      <select className="select font-mono text-xs" value={formTransferir.numeroCuentaDestino} onChange={e => setFormTransferir(f => ({ ...f, numeroCuentaDestino: e.target.value }))}>
                        <option value="">— Seleccionar —</option>
                        {cuentas.filter(c => c.estado === 'ACTIVA' && c.numeroCuenta !== formTransferir.numeroCuentaOrigen).map(c => (
                          <option key={c.id} value={c.numeroCuenta}>{c.titular}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Monto (ZC)</label>
                    <input className="input font-mono text-lg" type="number" placeholder="1000.00" value={formTransferir.monto} onChange={e => setFormTransferir(f => ({ ...f, monto: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Descripción (opcional)</label>
                    <input className="input" placeholder="Pago soberano..." value={formTransferir.descripcion} onChange={e => setFormTransferir(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={transferir} disabled={saving || !formTransferir.numeroCuentaOrigen || !formTransferir.numeroCuentaDestino || !formTransferir.monto} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <ArrowRightLeft className="w-4 h-4" />{saving ? 'Ejecutando...' : 'Ejecutar Transferencia'}
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
