import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useauth';
import { useUserRole } from '@/hooks/useuserrole';
import { Card } from '@/components/ui/card';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('employee' | 'manager' | 'admin')[];
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Lade...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Zugriff verweigert</h1>
          <p className="text-muted-foreground mb-4">
            Sie haben keine Berechtigung, diese Seite zu besuchen.
          </p>
          <p className="text-sm text-muted-foreground">
            Benötigte Rollen: {allowedRoles.join(', ')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Ihre Rolle: {role}
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
