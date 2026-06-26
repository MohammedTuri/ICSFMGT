import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CategoryExplorer from './pages/CategoryExplorer';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';

// Route guard: only allows users with ADMIN role
function AdminRoute({ children }) {
  const session = JSON.parse(localStorage.getItem('ics_auth_user'));
  if (!session || session.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Unprotected Route (No session required) */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes (Authentication checked by Layout guard) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="visa" element={<CategoryExplorer category="visa" />} />
          {/* Ethiopian Origin ID sub-routes */}
          <Route path="eoid" element={<Navigate to="/eoid/normal" replace />} />
          <Route path="eoid/normal" element={<CategoryExplorer category="eoid-normal" />} />
          <Route path="eoid/underage" element={<CategoryExplorer category="eoid-underage" />} />
          <Route path="residence-id" element={<CategoryExplorer category="residence-id" />} />
          <Route path="etd" element={<CategoryExplorer category="etd" />} />
          <Route path="eritrean-id" element={<CategoryExplorer category="eritrean-id" />} />
          <Route path="alien-passport" element={<CategoryExplorer category="alien-passport" />} />
          <Route path="yellow-card" element={<CategoryExplorer category="yellow-card" />} />
          <Route path="user-management" element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
