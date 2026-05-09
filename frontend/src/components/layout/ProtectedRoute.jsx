import { Navigate, Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function ProtectedRoute({ roles, nested = false }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-grid-fade bg-[length:36px_36px]">
        <div className="glass-panel flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold">
          <ShieldCheck className="animate-pulse text-cyber-green" size={18} />
          Securing workspace
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'MENTOR' ? '/mentor' : '/student'} replace />;
  }

  return nested ? <Outlet /> : <Outlet />;
}

