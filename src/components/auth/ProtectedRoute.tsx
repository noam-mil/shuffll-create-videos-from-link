import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type RequiredRole = 'system_admin' | 'meta_org_admin' | 'org_admin' | 'authenticated';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: RequiredRole;
  metaOrgId?: string;
  orgId?: string;
  fallbackPath?: string;
}

export const ProtectedRoute = ({
  children,
  requiredRole = 'authenticated',
  metaOrgId,
  orgId,
  fallbackPath = '/login',
}: ProtectedRouteProps) => {
  const { user, isLoading, isSystemAdmin, isMetaOrgAdmin, getUserRole, getMetaOrgRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role-based access
  const hasAccess = (): boolean => {
    switch (requiredRole) {
      case 'system_admin':
        return isSystemAdmin;
      
      case 'meta_org_admin':
        if (isSystemAdmin) return true;
        if (metaOrgId) return isMetaOrgAdmin(metaOrgId);
        return false;
      
      case 'org_admin':
        if (isSystemAdmin) return true;
        if (metaOrgId && isMetaOrgAdmin(metaOrgId)) return true;
        if (metaOrgId) {
          const metaRole = getMetaOrgRole(metaOrgId);
          if (metaRole === 'org_admin') return true;
        }
        if (orgId) {
          const role = getUserRole(orgId);
          return role === 'org_admin' || role === 'system_admin';
        }
        return false;
      
      case 'authenticated':
        return true;
      
      default:
        return false;
    }
  };

  if (!hasAccess()) {
    // Redirect to appropriate fallback
    if (requiredRole === 'system_admin') {
      return <Navigate to="/" replace />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
