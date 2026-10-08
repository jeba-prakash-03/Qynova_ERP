import React from 'react';
import { useAuth } from '../context/AuthContext';

interface CanProps {
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  requireEmployee?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  anyPermissions,
  allPermissions,
  requireEmployee = false,
  children,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check if employee profile is required
  if (requireEmployee && !user.employee) {
    return <>{fallback}</>;
  }

  // Admin bypasses granular permission checks
  if (user.roles?.includes('Admin')) {
    return <>{children}</>;
  }

  // Single permission check
  if (permission && !user.permissions?.includes(permission)) {
    return <>{fallback}</>;
  }

  // Any permission check
  if (anyPermissions && anyPermissions.length > 0) {
    const hasAny = anyPermissions.some((p) => user.permissions?.includes(p));
    if (!hasAny) {
      return <>{fallback}</>;
    }
  }

  // All permissions check
  if (allPermissions && allPermissions.length > 0) {
    const hasAll = allPermissions.every((p) => user.permissions?.includes(p));
    if (!hasAll) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default Can;
