import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Activos from './pages/Activos';
import Emision from './pages/Emision';
import Control from './pages/Control';
import Expansion from './pages/Expansion';
import Cuentas from './pages/Cuentas';
import Prestamos from './pages/Prestamos';
import Inteligencia from './pages/Inteligencia';
import Certificados from './pages/Certificados';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="activos" element={<Activos />} />
        <Route path="emision" element={<Emision />} />
        <Route path="cuentas" element={<Cuentas />} />
        <Route path="prestamos" element={<Prestamos />} />
        <Route path="control" element={<Control />} />
        <Route path="expansion" element={<Expansion />} />
        <Route path="certificados" element={<Certificados />} />
        <Route path="inteligencia" element={<Inteligencia />} />
      </Route>
    </Routes>
  );
}
