import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAssetStore } from './store/assetStore';
import { getSession } from './services/auth';
import Onboarding from './pages/Onboarding';
import ConsentFlow from './pages/ConsentFlow';
import Dashboard from './pages/Dashboard';
import AssetDetail from './pages/AssetDetail';
import EstateFiling from './pages/EstateFiling';
import Report from './pages/Report';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAssetStore((s) => s.isAuthenticated);
  const authChecked = useAssetStore((s) => s.authChecked);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#006c49]/30 border-t-[#006c49] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const authChecked = useAssetStore((s) => s.authChecked);
  const setUser = useAssetStore((s) => s.setUser);
  const setAuthChecked = useAssetStore((s) => s.setAuthChecked);

  useEffect(() => {
    if (authChecked) return;

    getSession()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, [authChecked, setUser, setAuthChecked]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionBootstrap>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Onboarding />} />
            <Route path="/consent" element={<ProtectedRoute><ConsentFlow /></ProtectedRoute>} />
            <Route path="/consent/callback" element={<ProtectedRoute><ConsentFlow /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/asset/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
            <Route path="/estate" element={<ProtectedRoute><EstateFiling /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SessionBootstrap>
    </BrowserRouter>
  );
}
