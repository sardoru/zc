import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Estimates from './pages/Estimates';
import PunchLists from './pages/PunchLists';
import PhotoAnalysis from './pages/PhotoAnalysis';
import SubContractors from './pages/SubContractors';
import ESignatures from './pages/ESignatures';
import PDFExport from './pages/PDFExport';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { seedIfEmpty } from './store';

export default function App() {
  useEffect(() => { seedIfEmpty(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="estimates" element={<Estimates />} />
          <Route path="punch-lists" element={<PunchLists />} />
          <Route path="photos" element={<PhotoAnalysis />} />
          <Route path="subs" element={<SubContractors />} />
          <Route path="signatures" element={<ESignatures />} />
          <Route path="export" element={<PDFExport />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
