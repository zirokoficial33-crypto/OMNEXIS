import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Activos from './pages/Activos';
import Emision from './pages/Emision';
import Control from './pages/Control';
import Expansion from './pages/Expansion';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="activos" element={<Activos />} />
        <Route path="emision" element={<Emision />} />
        <Route path="control" element={<Control />} />
        <Route path="expansion" element={<Expansion />} />
      </Route>
    </Routes>
  );
}
