import { useAuth } from '../context/AuthContext';

export const usePermission = (permission?: string): boolean => {
  const { user } = useAuth();
  if (!user) return false;

  // Admin role has unrestricted access to all permissions
  if (user.roles?.includes('Admin')) {
    return true;
  }

  if (!permission) return true;

  return user.permissions?.includes(permission) || false;
};

export const useHasEmployeeProfile = (): boolean => {
  const { user } = useAuth();
  return Boolean(user?.employee);
};

export default usePermission;
