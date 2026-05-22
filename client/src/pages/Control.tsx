import { useEffect, useState } from 'react';
import { api, ComandoSoberano, formatDate } from '../lib/api';
import { Shield, Plus, CheckCircle, Trash2, AlertCircle, X, Terminal } from 'lucide-react';

const PRIORIDADES = [
  { value: 1, label: 'Normal', color: 'text-sky-400' },
  { value: 2, label: 'Elevada', color: 'text-amber-400' },
  { value: 3, label: 'Crítica', color: 'text-red-400' },
];

const COMANDOS_PRESET = [
  'AUDITORIA_RESERVAS_COMPLETA',
  'CONGELAR_EMISION_TEMPORAL',
  'ACTIVAR_PROTOCOLO_SOBERANO',
  'SINCRONIZAR_LIBRO_MAYOR',
  'REVALUAR_ACTIVOS_CATEGORIA',
  'EMITIR_DECRETO_MONETARIO',
];

export default function Control() {
  const [comandos, setComandos] = useState<ComandoSoberano[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ comandoEjecutado: '', nivelPrioridad: '1', operador: '' });
  const [saving, setSaving] = useState(false);

  async function cargar() {
    setLoading(true);
    try { setComandos(await api.control.list()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  async function crear() {
    setSaving(true);
    try {
      await api.control.create({
        comandoEjecutado: form.comandoEjecutado,
        nivelPrioridad: Number(form.nivelPrioridad),
        operador: form.operador || undefined,
      });
      setShowModal(false);
      setForm({ comandoEjecutado: '', nivelPrioridad: '1', operador: '' });
      cargar();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function completar(id: number) {
    try {
      await api.control.completar(id, 'EJECUTADO_CON_EXITO');
      cargar();
    } catch (e: any) { setError(e.message); }
  }

  async function eliminar(id: number) {
    try {
      await api.control.delete(id);
      cargar();
    } catch (e: any) { setError(e.message); }
  }

  const pendientes = comandos.filter(c => !c.ejecucionFinalizada);
  const completados = comandos.filter(c => c.ejecucionFinalizada);

  function prioLabel(n: number) {
    return PRIORIDADES.find(p => p.value === n) || PRIORIDADES[0];
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2f0ff]">Control Soberano</h1>
          <p className="text-sm text-[#7aa8cc] mt-0.5">Centro de Comando — Poder de Ejecución Absoluto</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Comando
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card border-purple-900/40 bg-purple-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Total Comandos</p>
          <p className="text-2xl font-bold text-purple-400 font-mono mt-1">{comandos.length}</p>
        </div>
        <div className="card border-amber-900/40 bg-amber-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{pendientes.length}</p>
        </div>
        <div className="card border-emerald-900/40 bg-emerald-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Completados</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{completados.length}</p>
        </div>
      </div>

      {error && (
        <div className="card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {pendientes.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            En Cola de Ejecución ({pendientes.length})
          </h2>
          <div className="space-y-2">
            {pendientes.map(cmd => (
              <div key={cmd.id} className="card border-amber-900/30 bg-amber-950/10 flex items-center gap-4 pulse-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono text-sm text-[#e2f0ff]">{cmd.comandoEjecutado}</span>
                    <span className={`text-xs font-semibold ${prioLabel(cmd.nivelPrioridad).color}`}>
                      [{prioLabel(cmd.nivelPrioridad).label}]
                    </span>
                  </div>
                  <div className="text-xs text-[#3d6485]">
                    Operador: {cmd.operador} · {formatDate(cmd.fechaEjecucion)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => completar(cmd.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 text-xs border border-emerald-800/50 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Ejecutar
                  </button>
                  <button onClick={() => eliminar(cmd.id)}
                    className="p-1.5 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-[#3d6485] uppercase tracking-widest mb-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Historial de Ejecución ({completados.length})
        </h2>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#0d1b2e] rounded-xl animate-pulse" />)}</div>
        ) : completados.length === 0 ? (
          <div className="card text-center text-[#3d6485] text-sm py-8">
            <Shield className="w-8 h-8 mx-auto mb-3 opacity-20" />
            Sin historial de ejecución
          </div>
        ) : (
          <div className="space-y-2">
            {completados.map(cmd => (
              <div key={cmd.id} className="card border-[#1a3350] flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-sm text-[#7aa8cc]">{cmd.comandoEjecutado}</span>
                  </div>
                  <div className="text-xs text-[#3d6485]">
                    {cmd.resultado} · {formatDate(cmd.fechaEjecucion)}
                  </div>
                </div>
                <span className="badge-confirmado">COMPLETADO</span>
                <button onClick={() => eliminar(cmd.id)}
                  className="p-1.5 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md border-purple-900/40">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#e2f0ff]">Emitir Comando Soberano</h2>
              <button onClick={() => setShowModal(false)} className="text-[#3d6485] hover:text-[#e2f0ff]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Comando</label>
                <input className="input font-mono" placeholder="COMANDO_SOBERANO_001"
                  value={form.comandoEjecutado}
                  onChange={e => setForm(f => ({ ...f, comandoEjecutado: e.target.value }))} />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {COMANDOS_PRESET.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, comandoEjecutado: c }))}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0d1b2e] border border-[#1a3350] text-[#7aa8cc] hover:border-purple-800/50 hover:text-purple-400 transition-colors">
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Prioridad</label>
                  <select className="select" value={form.nivelPrioridad}
                    onChange={e => setForm(f => ({ ...f, nivelPrioridad: e.target.value }))}>
                    {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label} ({p.value})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Operador</label>
                  <input className="input" placeholder="SISTEMA_CENTRAL"
                    value={form.operador}
                    onChange={e => setForm(f => ({ ...f, operador: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={crear} disabled={saving || !form.comandoEjecutado}
                className="btn-primary flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                {saving ? 'Emitiendo...' : 'Emitir Comando'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
