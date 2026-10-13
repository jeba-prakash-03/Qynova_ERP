import { useAuth } from '../context/AuthContext';

export const usePermission = (permission?: string): boolean => {
  const { user } = useAuth();
  if (!user) return false;

  // Admin role has unrestricted access to all permissions
  if (user.roles?.includes('Admin')) {
    return true;
  }

  if (!permission) return true;

  const parts = permission.split(',').map((p) => p.trim());
  return parts.some((p) => user.permissions?.includes(p));
};

export const useHasEmployeeProfile = (): boolean => {
  const { user } = useAuth();
  return Boolean(user?.employee);
};

export default usePermission;
