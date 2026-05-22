import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Coins, Database, Shield, Zap, Infinity, Wallet, ArrowRightLeft
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Panel Central', icon: LayoutDashboard, exact: true },
  { to: '/activos', label: 'Activos Reales', icon: Database },
  { to: '/emision', label: 'Emisión ZC', icon: Coins },
  { to: '/cuentas', label: 'Cuentas Soberanas', icon: Wallet },
  { to: '/control', label: 'Control Soberano', icon: Shield },
  { to: '/expansion', label: 'Expansión Infinita', icon: Infinity, gold: true },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#070d1a] overflow-hidden">
      <aside className="w-60 flex flex-col border-r border-[#1a3350] bg-[#0a1525] shrink-0">
        <div className="p-5 border-b border-[#1a3350]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-[#e2f0ff] glow-text">ZIRCOIN</div>
              <div className="text-[10px] text-[#3d6485] font-mono uppercase tracking-widest">Banco Soberano</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, exact, gold }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive && gold
                    ? 'bg-amber-900/40 text-amber-400 border border-amber-800/50'
                    : isActive
                    ? 'bg-sky-900/40 text-sky-400 border border-sky-800/50'
                    : gold
                    ? 'text-amber-500/70 hover:bg-amber-950/30 hover:text-amber-400 border border-transparent hover:border-amber-900/30'
                    : 'text-[#7aa8cc] hover:bg-[#0f2035] hover:text-[#e2f0ff]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1a3350]">
          <div className="text-[10px] font-mono text-[#3d6485] text-center">
            <span className="text-emerald-500">●</span> SISTEMA OPERATIVO
          </div>
          <div className="text-[10px] font-mono text-[#3d6485] text-center mt-0.5">
            BANCO CENTRAL ZIROK
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
