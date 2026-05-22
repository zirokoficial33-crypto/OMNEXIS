import { useEffect, useState } from 'react';
import { api, Activo, TransaccionUI, formatZC, formatDate } from '../lib/api';
import { Zap, ArrowRightLeft, AlertCircle, X, CheckCircle2 } from 'lucide-react';

export default function Emision() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [transacciones, setTransacciones] = useState<TransaccionUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'emitir' | 'transferir'>('emitir');

  const [emitirForm, setEmitirForm] = useState({ montoEmitido: '', idActivoRespaldo: '', destino: '' });
  const [transferirForm, setTransferirForm] = useState({ montoEmitido: '', origen: '', destino: '', idActivoRespaldo: '' });
  const [processing, setProcessing] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([api.activos.list(), api.transacciones.list()]);
      setActivos(a.filter(x => x.estadoDisponibilidad === 'OPERATIVO'));
      setTransacciones(t);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  async function emitir() {
    if (!emitirForm.montoEmitido) return;
    setProcessing(true); setError(''); setSuccess('');
    try {
      const tx = await api.transacciones.emitir({
        montoEmitido: Number(emitirForm.montoEmitido),
        idActivoRespaldo: emitirForm.idActivoRespaldo ? Number(emitirForm.idActivoRespaldo) : undefined,
        destino: emitirForm.destino || undefined,
      });
      setSuccess(`[MATERIALIZACION]: ZIRCOIN ${(tx as any).serial || tx.serialBillete} emitido — ${formatZC(tx.montoEmitido)} ZC`);
      setEmitirForm({ montoEmitido: '', idActivoRespaldo: '', destino: '' });
      cargar();
    } catch (e: any) { setError(e.message); }
    finally { setProcessing(false); }
  }

  async function transferir() {
    if (!transferirForm.montoEmitido || !transferirForm.origen || !transferirForm.destino) return;
    setProcessing(true); setError(''); setSuccess('');
    try {
      const tx = await api.transacciones.transferir({
        montoEmitido: Number(transferirForm.montoEmitido),
        origen: transferirForm.origen,
        destino: transferirForm.destino,
        idActivoRespaldo: transferirForm.idActivoRespaldo ? Number(transferirForm.idActivoRespaldo) : undefined,
      });
      setSuccess(`[ZIRCOIN]: Transferencia de ${formatZC(tx.montoEmitido)} ZC confirmada — Serial ${tx.serialBillete}`);
      setTransferirForm({ montoEmitido: '', origen: '', destino: '', idActivoRespaldo: '' });
      cargar();
    } catch (e: any) { setError(e.message); }
    finally { setProcessing(false); }
  }

  const totalEmitido = transacciones.reduce((s, t) => s + Number(t.montoEmitido), 0);
  const emisionCount = transacciones.filter(t => t.tipoOperacion === 'EMISION').length;
  const transferCount = transacciones.filter(t => t.tipoOperacion === 'TRANSFERENCIA').length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#e2f0ff]">Motor de Emisión ZIRCOIN</h1>
        <p className="text-sm text-[#7aa8cc] mt-0.5">Libro Mayor — Registro soberano de toda operación</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card border-amber-900/40 bg-amber-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Circulación Total</p>
          <p className="text-xl font-bold text-amber-400 font-mono mt-1">{formatZC(totalEmitido)} ZC</p>
        </div>
        <div className="card border-sky-900/40 bg-sky-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Emisiones</p>
          <p className="text-xl font-bold text-sky-400 font-mono mt-1">{emisionCount}</p>
        </div>
        <div className="card border-emerald-900/40 bg-emerald-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Transferencias</p>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">{transferCount}</p>
        </div>
      </div>

      {error && (
        <div className="card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {success && (
        <div className="card border-emerald-800/50 bg-emerald-950/20 flex items-center gap-3 text-emerald-400 text-sm font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card space-y-4">
          <div className="flex border-b border-[#1a3350] pb-3 gap-2">
            <button
              onClick={() => setTab('emitir')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'emitir' ? 'bg-sky-900/40 text-sky-400 border border-sky-800/50' : 'text-[#7aa8cc] hover:text-[#e2f0ff]'}`}>
              <Zap className="w-3.5 h-3.5" /> Emitir
            </button>
            <button
              onClick={() => setTab('transferir')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'transferir' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50' : 'text-[#7aa8cc] hover:text-[#e2f0ff]'}`}>
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir
            </button>
          </div>

          {tab === 'emitir' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Monto a Emitir (ZC)</label>
                <input className="input font-mono text-lg" type="number" placeholder="5000.00"
                  value={emitirForm.montoEmitido}
                  onChange={e => setEmitirForm(f => ({ ...f, montoEmitido: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Activo de Respaldo (opcional)</label>
                <select className="select" value={emitirForm.idActivoRespaldo}
                  onChange={e => setEmitirForm(f => ({ ...f, idActivoRespaldo: e.target.value }))}>
                  <option value="">— Sin activo específico —</option>
                  {activos.map(a => <option key={a.id} value={a.id}>{a.nombreActivo} ({formatZC(a.valorTasaZircoin)} ZC)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Destino (opcional)</label>
                <input className="input" placeholder="CIRCULACION_SOBERANA"
                  value={emitirForm.destino}
                  onChange={e => setEmitirForm(f => ({ ...f, destino: e.target.value }))} />
              </div>
              <button onClick={emitir} disabled={processing || !emitirForm.montoEmitido}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                {processing ? 'Manifestando...' : 'Manifestar ZIRCOIN'}
              </button>
            </div>
          )}

          {tab === 'transferir' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Monto (ZC)</label>
                <input className="input font-mono text-lg" type="number" placeholder="1000.00"
                  value={transferirForm.montoEmitido}
                  onChange={e => setTransferirForm(f => ({ ...f, montoEmitido: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Origen</label>
                  <input className="input" placeholder="BANCO_CENTRAL_ZIROK"
                    value={transferirForm.origen}
                    onChange={e => setTransferirForm(f => ({ ...f, origen: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Destino</label>
                  <input className="input" placeholder="CUENTA_DESTINO"
                    value={transferirForm.destino}
                    onChange={e => setTransferirForm(f => ({ ...f, destino: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Activo de Respaldo (opcional)</label>
                <select className="select" value={transferirForm.idActivoRespaldo}
                  onChange={e => setTransferirForm(f => ({ ...f, idActivoRespaldo: e.target.value }))}>
                  <option value="">— Sin activo específico —</option>
                  {activos.map(a => <option key={a.id} value={a.id}>{a.nombreActivo}</option>)}
                </select>
              </div>
              <button onClick={transferir} disabled={processing || !transferirForm.montoEmitido || !transferirForm.origen || !transferirForm.destino}
                className="btn-secondary w-full flex items-center justify-center gap-2 border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/20">
                <ArrowRightLeft className="w-4 h-4" />
                {processing ? 'Procesando...' : 'Ejecutar Transferencia'}
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-[#e2f0ff] mb-4">Libro Mayor — Últimas Operaciones</h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-[#0d1b2e] rounded animate-pulse" />)}</div>
          ) : transacciones.length === 0 ? (
            <div className="text-center text-[#3d6485] text-sm py-8">Sin operaciones registradas</div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-80">
              {transacciones.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0a1525] border border-[#1a3350] hover:border-[#2a4a6e] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="tag-mono">{tx.serialBillete}</span>
                      <span className="text-xs text-[#3d6485]">{tx.tipoOperacion}</span>
                    </div>
                    <div className="text-xs text-[#3d6485] mt-0.5 truncate">
                      {tx.origen} → {tx.destino}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-amber-400 font-semibold">{formatZC(tx.montoEmitido)} ZC</div>
                    <div className="text-[10px] text-[#3d6485]">{formatDate(tx.timestampEmision)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
