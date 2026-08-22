import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAssetStore } from './store/assetStore';
import { getSession } from './services/auth';
import Login from './pages/login/Login';
import ConsentFlow from './pages/ConsentFlow';
import Dashboard from './pages/Dashboard';
import AssetDetail from './pages/AssetDetail';
import BrokerPortfolio from './pages/BrokerPortfolio';
import EstateFiling from './pages/EstateFiling';
import Report from './pages/Report';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Help from './pages/Help';
import UnclaimedAssets from './pages/UnclaimedAssets';
import { PricingPage } from './components/plans/PricingPage';
import { BillingDashboard } from './components/plans/BillingDashboard';
import NomineeUpdatePage from './components/nominee/NomineeUpdatePage';
import FamilyJoinPage from './components/family/FamilyJoinPage';
import InsuranceGapFinder from './components/insurance/InsuranceGapFinder';
import LoanEligibility from './components/loan/LoanEligibility';
import AncestralSearchPage from './components/ancestral/AncestralSearchPage';
import TwoFactorSettings from './pages/Settings/TwoFactorSettings';
import TOTPSetup from './pages/Settings/TOTPSetup';
import EmailSetup from './pages/Settings/EmailSetup';
import TrustedDevices from './pages/Settings/TrustedDevices';
import './index.css';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

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
  // We no longer blindly redirect based on hasConsent to avoid the refresh bug.
  // The Dashboard will fetch the actual consents and redirect if needed.

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
      <ScrollToTop />
      <SessionBootstrap>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/consent" element={<ProtectedRoute><ConsentFlow /></ProtectedRoute>} />
            <Route path="/consent/callback" element={<ProtectedRoute><ConsentFlow /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/asset/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
            <Route path="/broker/:id" element={<ProtectedRoute><BrokerPortfolio /></ProtectedRoute>} />
            <Route path="/estate" element={<ProtectedRoute><EstateFiling /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/2fa" element={<ProtectedRoute><TwoFactorSettings /></ProtectedRoute>} />
            <Route path="/settings/2fa/totp" element={<ProtectedRoute><TOTPSetup /></ProtectedRoute>} />
            <Route path="/settings/2fa/email" element={<ProtectedRoute><EmailSetup /></ProtectedRoute>} />
            <Route path="/settings/2fa/devices" element={<ProtectedRoute><TrustedDevices /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
            <Route path="/unclaimed" element={<ProtectedRoute><UnclaimedAssets /></ProtectedRoute>} />
            <Route path="/nominee/update" element={<ProtectedRoute><NomineeUpdatePage /></ProtectedRoute>} />
            <Route path="/family/join" element={<ProtectedRoute><FamilyJoinPage /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><BillingDashboard /></ProtectedRoute>} />
            <Route path="/insurance/gap" element={<ProtectedRoute><InsuranceGapFinder /></ProtectedRoute>} />
            <Route path="/loan/eligibility" element={<ProtectedRoute><LoanEligibility /></ProtectedRoute>} />
            <Route path="/ancestral" element={<ProtectedRoute><AncestralSearchPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SessionBootstrap>
    </BrowserRouter>
  );
}
