import { useEffect, useState } from 'react';
import { api, Activo, formatZC, formatDate } from '../lib/api';
import { Plus, Pencil, Trash2, AlertCircle, X, Check } from 'lucide-react';

const ESTADOS = ['OPERATIVO', 'INACTIVO', 'RESERVA', 'AUDITORIA'];
const CATEGORIAS = ['GENERAL', 'INMUEBLE', 'COMMODITIES', 'DATOS', 'CAPACIDAD_PRODUCTIVA', 'TECNOLOGIA'];

function EstadoBadge({ estado }: { estado: string }) {
  const cls =
    estado === 'OPERATIVO' ? 'badge-operativo' :
    estado === 'RESERVA' ? 'badge-reserva' :
    'badge-inactivo';
  return <span className={cls}>{estado}</span>;
}

interface FormData {
  nombreActivo: string;
  valorTasaZircoin: string;
  estadoDisponibilidad: string;
  categoria: string;
  descripcion: string;
}

const empty: FormData = {
  nombreActivo: '', valorTasaZircoin: '', estadoDisponibilidad: 'OPERATIVO',
  categoria: 'GENERAL', descripcion: '',
};

export default function Activos() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Activo | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function cargar() {
    setLoading(true);
    try { setActivos(await api.activos.list()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  function abrirCrear() { setEditando(null); setForm(empty); setShowModal(true); }
  function abrirEditar(a: Activo) {
    setEditando(a);
    setForm({
      nombreActivo: a.nombreActivo,
      valorTasaZircoin: a.valorTasaZircoin,
      estadoDisponibilidad: a.estadoDisponibilidad,
      categoria: a.categoria,
      descripcion: a.descripcion || '',
    });
    setShowModal(true);
  }

  async function guardar() {
    setSaving(true);
    try {
      if (editando) {
        await api.activos.update(editando.id, form as any);
      } else {
        await api.activos.create(form as any);
      }
      setShowModal(false);
      cargar();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function eliminar(id: number) {
    setDeletingId(id);
    try {
      await api.activos.delete(id);
      cargar();
    } catch (e: any) { setError(e.message); }
    finally { setDeletingId(null); }
  }

  const total = activos.reduce((s, a) => s + Number(a.valorTasaZircoin), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e2f0ff]">Activos Reales</h1>
          <p className="text-sm text-[#7aa8cc] mt-0.5">Respaldo físico del ZIRCOIN</p>
        </div>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Activo
        </button>
      </div>

      {error && (
        <div className="card border-red-800/50 bg-red-950/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card border-sky-900/40 bg-sky-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Total Activos</p>
          <p className="text-2xl font-bold text-sky-400 font-mono mt-1">{activos.length}</p>
        </div>
        <div className="card border-amber-900/40 bg-amber-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Valor Total</p>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{formatZC(total)} ZC</p>
        </div>
        <div className="card border-emerald-900/40 bg-emerald-950/20">
          <p className="text-xs text-[#7aa8cc] uppercase tracking-wider">Operativos</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {activos.filter(a => a.estadoDisponibilidad === 'OPERATIVO').length}
          </p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#0d1b2e] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activos.length === 0 ? (
          <div className="text-center py-12 text-[#3d6485]">
            <Database className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay activos registrados</p>
            <button onClick={abrirCrear} className="btn-primary mt-4 text-xs">Registrar primer activo</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#3d6485] text-xs uppercase tracking-wider border-b border-[#1a3350]">
                  <th className="text-left pb-3 pr-4">Activo</th>
                  <th className="text-left pb-3 pr-4">Categoría</th>
                  <th className="text-right pb-3 pr-4">Valor (ZC)</th>
                  <th className="text-left pb-3 pr-4">Estado</th>
                  <th className="text-left pb-3 pr-4">Registrado</th>
                  <th className="text-right pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3350]">
                {activos.map(a => (
                  <tr key={a.id} className="hover:bg-[#0d1b2e] transition-colors group">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-[#e2f0ff]">{a.nombreActivo}</div>
                      {a.descripcion && <div className="text-xs text-[#3d6485] truncate max-w-[200px]">{a.descripcion}</div>}
                    </td>
                    <td className="py-3 pr-4 text-[#7aa8cc] text-xs font-mono">{a.categoria}</td>
                    <td className="py-3 pr-4 text-right font-mono text-amber-400 font-semibold">{formatZC(a.valorTasaZircoin)}</td>
                    <td className="py-3 pr-4"><EstadoBadge estado={a.estadoDisponibilidad} /></td>
                    <td className="py-3 pr-4 text-[#3d6485] text-xs">{formatDate(a.fechaCreacion)}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirEditar(a)} className="p-1.5 rounded-lg hover:bg-sky-900/30 text-sky-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => eliminar(a.id)}
                          disabled={deletingId === a.id}
                          className="p-1.5 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md border-[#2a4a6e]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#e2f0ff]">
                {editando ? 'Editar Activo' : 'Registrar Nuevo Activo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#3d6485] hover:text-[#e2f0ff]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Nombre del Activo</label>
                <input className="input" placeholder="Ej: Lote_Popsicles_001" value={form.nombreActivo}
                  onChange={e => setForm(f => ({ ...f, nombreActivo: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Valor en ZIRCOIN</label>
                  <input className="input" type="number" placeholder="0.00" value={form.valorTasaZircoin}
                    onChange={e => setForm(f => ({ ...f, valorTasaZircoin: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7aa8cc] block mb-1">Estado</label>
                  <select className="select" value={form.estadoDisponibilidad}
                    onChange={e => setForm(f => ({ ...f, estadoDisponibilidad: e.target.value }))}>
                    {ESTADOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Categoría</label>
                <select className="select" value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#7aa8cc] block mb-1">Descripción (opcional)</label>
                <textarea className="input resize-none" rows={2} placeholder="Descripción del activo..."
                  value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={guardar} disabled={saving || !form.nombreActivo || !form.valorTasaZircoin}
                className="btn-gold flex items-center gap-2">
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editando ? 'Actualizar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Database({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function RefreshCw({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
