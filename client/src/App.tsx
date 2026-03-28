import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Mock Pages component imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Clients from './pages/Clients';
import TemplateEditor from './pages/TemplateEditor';
import Scanner from './pages/Scanner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="eventos" element={<Events />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="plantilla" element={<TemplateEditor />} />
            <Route path="plantilla" element={<TemplateEditor />} />
          </Route>
        </Route>

        {/* Public Routes */}
        <Route path="/scan" element={<Scanner />} />

        {/* Redirect root based on auth */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
