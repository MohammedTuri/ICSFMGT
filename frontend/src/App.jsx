import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CategoryExplorer from './pages/CategoryExplorer';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import RecycleBin from './pages/RecycleBin';
import SystemConfiguration from './pages/SystemConfiguration';
import { getSystemModules } from './utils/db';
import { BranchProvider } from './context/BranchContext';

// Route guard: only allows users with ADMIN role
function AdminRoute({ children }) {
  const session = JSON.parse(localStorage.getItem('ics_auth_user'));
  const role = (session?.role || '').toUpperCase();
  if (!session || role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Route guard: allows ADMIN and SUPERVISOR to manage user accounts
function UserManagementRoute({ children }) {
  const session = JSON.parse(localStorage.getItem('ics_auth_user'));
  const role = (session?.role || '').toUpperCase();
  if (!session || (role !== 'ADMIN' && role !== 'SUPERVISOR')) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Division guard: checks division access with ADMIN bypass
function DivisionGuard({ children, divisionKey: explicitKey }) {
  const params = window.location.pathname.split('/').filter(Boolean);
  const pathKey = params[0] === 'modules' ? params[1] : params[0];
  const divisionKey = explicitKey || pathKey || '';

  const user = JSON.parse(localStorage.getItem('ics_auth_user') || '{}');
  const userRole = (user?.role || '').toUpperCase();

  // 1. Bypass access checks completely for ADMIN, SUPERVISOR, and AUDITOR
  if (userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'AUDITOR') {
    return children;
  }

  // 2. Check fine-grained module permissions or allowed divisions for standard users
  const modulePerms = user?.modulePermissions || {};
  const allowed = (user?.allowedDivisions || [])
    .filter(d => typeof d === 'string')
    .map(d => d.toLowerCase());
  const key = (divisionKey || '').toLowerCase();
  const keyUnderscore = key.replace(/-/g, '_');
  const keyHyphen = key.replace(/_/g, '-');

  const permVal = modulePerms[key] || modulePerms[keyUnderscore] || modulePerms[keyHyphen];
  const hasModulePerm = permVal && permVal !== 'NO_ACCESS';

  const isAllowed = 
    hasModulePerm ||
    allowed.includes(key) ||
    allowed.includes(keyUnderscore) ||
    allowed.includes(keyHyphen) ||
    (key === 'eoid' && (
      (modulePerms['eoid-normal'] && modulePerms['eoid-normal'] !== 'NO_ACCESS') ||
      (modulePerms['eoid-underage'] && modulePerms['eoid-underage'] !== 'NO_ACCESS') ||
      allowed.includes('eoid-normal') ||
      allowed.includes('eoid-underage')
    ));

  if (!isAllowed) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h2>Unauthorized Clearance Access</h2>
        <p>Your account is restricted. You are not assigned to work in the {divisionKey} Division.</p>
      </div>
    );
  }

  return children;
}

function App() {
  const [customModules, setCustomModules] = useState([]);

  useEffect(() => {
    getSystemModules().then(mods => setCustomModules(mods || [])).catch(() => {});
  }, []);

  return (
    <BranchProvider>
      <Router>
        <Routes>
          {/* Unprotected Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit-log" element={<AuditLog />} />

            {/* Division Explorer Routes with Guard */}
            <Route path="visa" element={
              <DivisionGuard divisionKey="visa">
                <CategoryExplorer category="visa" />
              </DivisionGuard>
            } />

            <Route path="eoid" element={
              <DivisionGuard divisionKey="eoid">
                <CategoryExplorer category="eoid" />
              </DivisionGuard>
            } />
            <Route path="eoid/normal" element={<Navigate to="/eoid" replace />} />
            <Route path="eoid/underage" element={<Navigate to="/eoid" replace />} />

            <Route path="residence-id" element={
              <DivisionGuard divisionKey="residence-id">
                <CategoryExplorer category="residence-id" />
              </DivisionGuard>
            } />

            <Route path="residence-id-cancellation" element={
              <DivisionGuard divisionKey="residence-id-cancellation">
                <CategoryExplorer category="residence-id-cancellation" />
              </DivisionGuard>
            } />

            <Route path="etd" element={
              <DivisionGuard divisionKey="etd">
                <CategoryExplorer category="etd" />
              </DivisionGuard>
            } />

            <Route path="eritrean-id" element={
              <DivisionGuard divisionKey="eritrean-id">
                <CategoryExplorer category="eritrean-id" />
              </DivisionGuard>
            } />

            <Route path="alien-passport" element={
              <DivisionGuard divisionKey="alien-passport">
                <CategoryExplorer category="alien-passport" />
              </DivisionGuard>
            } />

            {/* Dynamic Custom Module Routes (Specific & Parameterized) */}
            <Route path="modules/:category" element={
              <DivisionGuard>
                <CategoryExplorer />
              </DivisionGuard>
            } />

            {customModules.filter(m => m.isActive).map(mod => (
              <Route key={mod.key} path={`modules/${mod.key}`} element={
                <DivisionGuard divisionKey={mod.key}>
                  <CategoryExplorer category={mod.key} customModule={mod} />
                </DivisionGuard>
              } />
            ))}

            {/* Admin & Supervisor User Module Routes */}
            <Route path="user-management" element={
              <UserManagementRoute>
                <UserManagement />
              </UserManagementRoute>
            } />
            <Route path="user-module" element={
              <UserManagementRoute>
                <UserManagement />
              </UserManagementRoute>
            } />
            <Route path="users" element={
              <UserManagementRoute>
                <UserManagement />
              </UserManagementRoute>
            } />
            <Route path="recycle-bin" element={
              <AdminRoute>
                <RecycleBin />
              </AdminRoute>
            } />
            <Route path="system-config" element={
              <AdminRoute>
                <SystemConfiguration />
              </AdminRoute>
            } />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </BranchProvider>
  );
}

export default App;