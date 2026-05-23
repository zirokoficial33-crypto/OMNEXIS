import { useEffect, useState, useCallback } from 'react';
import { api, formatZC, formatDate } from '../lib/api';
import {
  Award, Plus, ArrowRightLeft, CheckCircle2, AlertCircle, X,
  Shield, Clock, Banknote, RefreshCw, Send, Unlock
} from 'lucide-react';

interface Certificado {
  id: number;
  serialCertificado: string;
  denominacion: string;
  estado: string;
  clase: string;
  descripcion: string | null;
  fechaEmision: string;
  fechaVencimiento: string | null;
  fechaRedencion: string | null;
  idActivoRespaldo: number | null;
  idCuentaTenedor: number | null;
  nombreActivo: string | null;
  titularCuenta: string | null;
  numeroCuenta: string | null;
}

interface Mov { id: number; tipo: string; notas: string | null; timestamp: string; idCuentaOrigen: number | null; idCuentaDestino: number | null; }
interface Stats { total: number; valorTotal: number; activos: number; redimidos: number; transferidos: number; valorActivo: number; }
interface Cuenta { id: number; titular: string; saldo: string; numeroCuenta: string; estado: string; }

const CLASES = ['SOBERANO', 'CORPORATIVO', 'RESERVA', 'ACTIVO', 'DIGITAL'];
const CLASE_COLORS: Record<string, string> = {
  SOBERANO: 'text-amber-400 border-amber-800/50 bg-amber-950/20',
  CORPORATIVO: 'text-purple-400 border-purple-800/50 bg-purple-950/20',
  RESERVA: 'text-sky-400 border-sky-800/50 bg-sky-950/20',
  ACTIVO: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/20',
  DIGITAL: 'text-pink-400 border-pink-800/50 bg-pink-950/20',
};

function EstadoBadge({ estado }: { estado: string }) {
  const m: Record<string, string> = {
    ACTIVO: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/40',
    REDIMIDO: 'bg-sky-900/40 text-sky-400 border-sky-800/40',
    TRANSFERIDO: 'bg-purple-900/40 text-purple-400 border-purple-800/40',
    VENCIDO: 'bg-red-900/40 text-red-400 border-red-800/40',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${m[estado] || 'bg-[#1a3350] text-[#7aa8cc] border-[#2a4a6e]'}`}>{estado}</span>;
}

function CertCard({ cert, selected, onClick }: { cert: Certificado; selected: boolean; onClick: () => void }) {
  const claseColor = CLASE_COLORS[cert.clase] || CLASE_COLORS.SOBERANO;
  return (
    <button onClick={onClick} className={`w-full text-left p-3 rounded-xl border transition-all ${selected ? 'bg-amber-950/20 border-amber-700/50' : 'bg-[#0a1525] border-[#1a3350] hover:border-[#2a4a6e]'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-[#3d6485] truncate">{cert.serialCertificado}</p>
          <p className="text-xs font-semibold text-[#e2f0ff] truncate mt-0.5">{cert.titularCuenta ?? 'Sin titular'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold font-mono text-amber-400">{formatZC(cert.denominacion)}</p>
          <p className="text-[10px] text-[#3d6485]">ZC</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <EstadoBadge estado={cert.estado} />
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${claseColor}`}>{cert.clase}</span>
      </div>
    </button>
  );
}

function CertVisual({ cert }: { cert: Certificado }) {
  const claseColor = CLASE_COLORS[cert.clase] || CLASE_COLORS.SOBERANO;
  const gradients: Record<string, string> = {
    SOBERANO: 'from-amber-900/30 to-[#0f2035]',
    CORPORATIVO: 'from-purple-900/20 to-[#0f2035]',
    RESERVA: 'from-sky-900/20 to-[#0f2035]',
    ACTIVO: 'from-emerald-900/20 to-[#0f2035]',
    DIGITAL: 'from-pink-900/20 to-[#0f2035]',
  };
  return (
    <div className={`rounded-2xl border border-amber-900/30 bg-gradient-to-br ${gradients[cert.clase] || gradients.SOBERANO} p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-40 h-40 opacity-5">
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" /><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" /><circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" /><line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.3" /><line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.3" /></svg>
      </div>
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-mono text-[#7aa8cc] uppercase tracking-widest">Certificado de Valor</span>
            </div>
            <p className="text-[10px] font-mono text-[#3d6485]">BANCO DE SOBERANÍA ABSOLUTA · ZIRCOIN</p>
          </div>
          <div className="text-right">
            <EstadoBadge estado={cert.estado} />
            <span className={`block mt-1 text-[10px] px-2 py-0.5 rounded-full border ${claseColor}`}>{cert.clase}</span>
          </div>
        </div>
        <div className="text-center my-4">
          <p className="text-4xl font-bold font-mono text-amber-400">{formatZC(cert.denominacion)}</p>
          <p className="text-sm text-[#7aa8cc] mt-1">ZIRCOIN</p>
        </div>
        <div className="font-mono text-xs text-[#3d6485] text-center tracking-[0.3em] mt-2 mb-4">{cert.serialCertificado}</div>
        <div className="grid grid-cols-3 gap-3 text-xs border-t border-[#1a3350] pt-4">
          <div><p className="text-[10px] text-[#3d6485]">TITULAR</p><p className="text-[#e2f0ff] font-medium mt-0.5">{cert.titularCuenta ?? '—'}</p></div>
          <div><p className="text-[10px] text-[#3d6485]">EMISIÓN</p><p className="text-[#e2f0ff] font-medium mt-0.5">{formatDate(cert.fechaEmision).split(',')[0]}</p></div>
          <div><p className="text-[10px] text-[#3d6485]">RESPALDO</p><p className="text-[#e2f0ff] font-medium mt-0.5 truncate">{cert.nombreActivo ?? 'General'}</p></div>
        </div>
        {cert.descripcion && <p className="text-[10px] text-[#3d6485] mt-3 italic">{cert.descripcion}</p>}
      </div>
    </div>
  );
}

export default function Certificados() {
  const [certs, setCerts] = useState<Certificado[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<Certificado | null>(null);
  const [movimientos, setMovimientos] = useState<Mov[]>([]);
  const [modal, setModal] = useState<'emitir' | 'transferir' | 'redimir' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formEmitir, setFormEmitir] = useState({ denominacion: '', idActivoRespaldo: '', idCuentaTenedor: '', clase: 'SOBERANO', descripcion: '', diasVigencia: '' });
  const [formTransferir, setFormTransferir] = useState({ idCuentaDestino: '', notas: '' });
  const [formRedimir, setFormRedimir] = useState({ idCuentaCobro: '', notas: '' });

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [c, s, cu, ac] = await Promise.all([
        api.certificados.list(),
        api.certificados.stats(),
        api.cuentas.list(),
        api.activos.list(),
      ]);
      setCerts(c);
      setStats(s);
      setCuentas(cu.filter((x: Cuenta) => x.estado === 'ACTIVA'));
      setActivos(ac.filter((x: any) => x.estadoDisponibilidad === 'OPERATIVO'));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function verMovimientos(c: Certificado) {
    setSeleccionado(c);
    const m = await api.certificados.movimientos(c.id);
    setMovimientos(m);
  }

  async function emitir() {
    if (!formEmitir.denominacion) return;
    setSaving(true); setError('');
    try {
      await api.certificados.emitir({
        denominacion: Number(formEmitir.denominacion),
        idActivoRespaldo: formEmitir.idActivoRespaldo ? Number(formEmitir.idActivoRespaldo) : undefined,
        idCuentaTenedor: formEmitir.idCuentaTenedor ? Number(formEmitir.idCuentaTenedor) : undefined,
        clase: formEmitir.clase,
        descripcion: formEmitir.descripcion || undefined,
        diasVigencia: formEmitir.diasVigencia ? Number(formEmitir.diasVigencia) : undefined,
      });
      setSuccess(`Certificado de ${formatZC(formEmitir.denominacion)} ZC emitido`);
      setModal(null);
      setFormEmitir({ denominacion: '', idActivoRespaldo: '', idCuentaTenedor: '', clase: 'SOBERANO', descripcion: '', diasVigencia: '' });
      setTimeout(() => setSuccess(''), 4000);
      cargar(true);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function transferir() {
    if (!seleccionado || !formTransferir.idCuentaDestino) return;
    setSaving(true); setError('');
    try {
      await api.certificados.transferir(seleccionado.id, { idCuentaDestino: Number(formTransferir.idCuentaDestino), notas: formTransferir.notas });
      setSuccess('Certificado transferido exitosamente');
      setModal(null); setFormTransferir({ idCuentaDestino: '', notas: '' });
      setTimeout(() => setSuccess(''), 4000);
      await cargar(true);
      const updated = certs.find(c => c.id === seleccionado.id);
      if (updated) verMovimientos(updated);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function redimir() {
    if (!seleccionado) return;
    setSaving(true); setError('');
    try {
      await api.certificados.redimir(seleccionado.id, { idCuentaCobro: formRedimir.idCuentaCobro ? Number(formRedimir.idCuentaCobro) : undefined, notas: formRedimir.notas });
      setSuccess(`${formatZC(seleccionado.denominacion)} ZC redimidos`);
      setModal(null); setFormRedimir({ idCuentaCobro: '', notas: '' });
      setTimeout(() => setSuccess(''), 4000);
      setSeleccionado(null);
      cargar(true);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const activos_list = certs.filter(c => c.estado === 'ACTIVO');
  const inactivos = certs.filter(c => c.estado !== 'ACTIVO');

  return (
    <div className="flex h-full overflow-hidden">
      {/* LISTA */}
      <div className="w-80 border-r border-[#1a3350] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#1a3350] flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-[#e2f0ff]">Certificados de Valor</h1>
            <p className="text-xs text-[#3d6485] mt-0.5">{stats?.activos ?? 0} activos · {certs.length} total</p>
          </div>
          <button onClick={() => setModal('emitir')} className="btn-gold flex items-center gap-1 text-xs px-3 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Emitir
          </button>
        </div>

        {/* STATS */}
        <div className="p-3 border-b border-[#1a3350] grid grid-cols-2 gap-2">
          <div className="bg-[#0a1525] rounded-lg p-2.5 border border-[#1a3350]">
            <p className="text-[10px] text-[#3d6485] uppercase tracking-wider">Valor Activo</p>
            <p className="text-sm font-bold text-amber-400 font-mono mt-0.5">{formatZC(stats?.valorActivo ?? 0)}</p>
            <p className="text-[10px] text-[#3d6485]">ZC en circulación</p>
          </div>
          <div className="bg-[#0a1525] rounded-lg p-2.5 border border-[#1a3350]">
            <p className="text-[10px] text-[#3d6485] uppercase tracking-wider">Redimidos</p>
            <p className="text-sm font-bold text-sky-400 font-mono mt-0.5">{stats?.redimidos ?? 0}</p>
            <p className="text-[10px] text-[#3d6485]">{formatZC(stats?.valorTotal ?? 0)} ZC total</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-[#0a1525] rounded-xl animate-pulse" />) : (
            <>
              {activos_list.length > 0 && <p className="text-[10px] font-mono text-emerald-400 px-1 pt-1 uppercase tracking-widest">Activos ({activos_list.length})</p>}
              {activos_list.map(c => <CertCard key={c.id} cert={c} selected={seleccionado?.id === c.id} onClick={() => verMovimientos(c)} />)}
              {inactivos.length > 0 && <p className="text-[10px] font-mono text-[#3d6485] px-1 pt-2 uppercase tracking-widest">Histórico ({inactivos.length})</p>}
              {inactivos.map(c => <CertCard key={c.id} cert={c} selected={seleccionado?.id === c.id} onClick={() => verMovimientos(c)} />)}
              {certs.length === 0 && (
                <div className="text-center py-10 text-[#3d6485]">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Sin certificados emitidos</p>
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
            <Award className="w-14 h-14 mb-4 opacity-10" />
            <p className="text-sm">Selecciona un certificado para ver su detalle</p>
            <button onClick={() => setModal('emitir')} className="btn-gold mt-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Emitir primer certificado</button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <CertVisual cert={seleccionado} />

            {/* ACCIONES */}
            {seleccionado.estado === 'ACTIVO' && (
              <div className="flex gap-3">
                <button onClick={() => setModal('transferir')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/30 hover:bg-purple-800/40 text-purple-400 text-sm border border-purple-800/50 transition-colors">
                  <Send className="w-4 h-4" /> Transferir
                </button>
                <button onClick={() => setModal('redimir')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-900/30 hover:bg-sky-800/40 text-sky-400 text-sm border border-sky-800/50 transition-colors">
                  <Unlock className="w-4 h-4" /> Redimir
                </button>
              </div>
            )}

            {/* MOVIMIENTOS */}
            <div className="card">
              <h3 className="text-sm font-semibold text-[#e2f0ff] mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#7aa8cc]" /> Historial de Movimientos
              </h3>
              {movimientos.length === 0 ? (
                <div className="text-center py-6 text-[#3d6485] text-sm">Sin movimientos registrados</div>
              ) : (
                <div className="space-y-2">
                  {movimientos.map(m => {
                    const typeColors: Record<string, string> = {
                      EMISION: 'text-emerald-400',
                      TRANSFERENCIA: 'text-purple-400',
                      REDENCION: 'text-sky-400',
                    };
                    return (
                      <div key={m.id} className="flex items-center gap-4 p-3 rounded-lg bg-[#0a1525] border border-[#1a3350]">
                        <div className={`text-xs font-mono font-bold w-20 shrink-0 ${typeColors[m.tipo] || 'text-[#7aa8cc]'}`}>{m.tipo}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#e2f0ff]">{m.notas}</p>
                          <p className="text-[10px] text-[#3d6485] mt-0.5">{formatDate(m.timestamp)}</p>
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

      {/* MODALES */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md border-amber-900/40">
            {/* EMITIR */}
            {modal === 'emitir' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><Award className="w-5 h-5 text-amber-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Emitir Certificado de Valor</h2></div>
                  <button onClick={() => setModal(null)}><X className="w-5 h-5 text-[#3d6485]" /></button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#7aa8cc] block mb-1">Denominación (ZC)</label>
                      <input className="input font-mono text-lg" type="number" placeholder="10000" value={formEmitir.denominacion} onChange={e => setFormEmitir(f => ({ ...f, denominacion: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-[#7aa8cc] block mb-1">Vigencia (días)</label>
                      <input className="input font-mono" type="number" placeholder="365 (opcional)" value={formEmitir.diasVigencia} onChange={e => setFormEmitir(f => ({ ...f, diasVigencia: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Clase</label>
                    <select className="select" value={formEmitir.clase} onChange={e => setFormEmitir(f => ({ ...f, clase: e.target.value }))}>
                      {CLASES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Activo de Respaldo</label>
                    <select className="select" value={formEmitir.idActivoRespaldo} onChange={e => setFormEmitir(f => ({ ...f, idActivoRespaldo: e.target.value }))}>
                      <option value="">— Sin respaldo específico —</option>
                      {activos.map(a => <option key={a.id} value={a.id}>{a.nombreActivo} — {formatZC(a.valorTasaZircoin)} ZC</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Cuenta Tenedora</label>
                    <select className="select" value={formEmitir.idCuentaTenedor} onChange={e => setFormEmitir(f => ({ ...f, idCuentaTenedor: e.target.value }))}>
                      <option value="">— Sin asignar —</option>
                      {cuentas.map(c => <option key={c.id} value={c.id}>{c.titular} · {c.numeroCuenta}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Descripción</label>
                    <input className="input" placeholder="Instrumento soberano..." value={formEmitir.descripcion} onChange={e => setFormEmitir(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={emitir} disabled={saving || !formEmitir.denominacion} className="btn-gold flex items-center gap-2 disabled:opacity-50">
                    <Award className="w-4 h-4" />{saving ? 'Emitiendo...' : 'Emitir Certificado'}
                  </button>
                </div>
              </>
            )}

            {/* TRANSFERIR */}
            {modal === 'transferir' && seleccionado && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><Send className="w-5 h-5 text-purple-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Transferir Certificado</h2></div>
                  <button onClick={() => setModal(null)}><X className="w-5 h-5 text-[#3d6485]" /></button>
                </div>
                <div className="bg-[#0a1525] rounded-lg p-3 mb-4 border border-[#1a3350] text-xs font-mono">
                  <span className="text-[#3d6485]">Certificado: </span><span className="text-amber-400">{seleccionado.serialCertificado}</span>
                  <br /><span className="text-[#3d6485]">Valor: </span><span className="text-emerald-400">{formatZC(seleccionado.denominacion)} ZC</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Cuenta Destino</label>
                    <select className="select" value={formTransferir.idCuentaDestino} onChange={e => setFormTransferir(f => ({ ...f, idCuentaDestino: e.target.value }))}>
                      <option value="">— Seleccionar receptor —</option>
                      {cuentas.filter(c => c.id !== seleccionado.idCuentaTenedor).map(c => <option key={c.id} value={c.id}>{c.titular} · {c.numeroCuenta}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Notas</label>
                    <input className="input" placeholder="Motivo de transferencia..." value={formTransferir.notas} onChange={e => setFormTransferir(f => ({ ...f, notas: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={transferir} disabled={saving || !formTransferir.idCuentaDestino} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm disabled:opacity-50">
                    <Send className="w-4 h-4" />{saving ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                  </button>
                </div>
              </>
            )}

            {/* REDIMIR */}
            {modal === 'redimir' && seleccionado && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2"><Unlock className="w-5 h-5 text-sky-400" /><h2 className="text-base font-semibold text-[#e2f0ff]">Redimir Certificado</h2></div>
                  <button onClick={() => setModal(null)}><X className="w-5 h-5 text-[#3d6485]" /></button>
                </div>
                <div className="bg-sky-950/20 border border-sky-900/30 rounded-lg p-3 mb-4 text-xs font-mono text-sky-400">
                  El valor <span className="text-amber-400">{formatZC(seleccionado.denominacion)} ZC</span> será acreditado en la cuenta seleccionada y el certificado quedará REDIMIDO.
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Acreditar en cuenta (opcional)</label>
                    <select className="select" value={formRedimir.idCuentaCobro} onChange={e => setFormRedimir(f => ({ ...f, idCuentaCobro: e.target.value }))}>
                      <option value="">— Sin acreditación —</option>
                      {cuentas.map(c => <option key={c.id} value={c.id}>{c.titular} · {formatZC(c.saldo)} ZC</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#7aa8cc] block mb-1">Notas</label>
                    <input className="input" placeholder="Motivo de redención..." value={formRedimir.notas} onChange={e => setFormRedimir(f => ({ ...f, notas: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                  <button onClick={redimir} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-sm disabled:opacity-50">
                    <Unlock className="w-4 h-4" />{saving ? 'Redimiendo...' : 'Confirmar Redención'}
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
