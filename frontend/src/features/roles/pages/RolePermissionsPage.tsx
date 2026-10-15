import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { SkeletonCard, SkeletonTable } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { useToast } from '../../../shared/context/ToastContext';
import { ArrowLeft, Save } from 'lucide-react';

export const RolePermissionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());

  // Fetch role details (contains currently assigned permissionIds)
  const { data: role, isLoading: loadingRole, isError } = useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      const res = await axiosClient.get(`/roles/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // Fetch all system permissions
  const { data: allPermissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/permissions');
      return res.data.data as Array<{
        id: number;
        module: string;
        action: string;
        name: string;
        description: string;
      }>;
    },
  });

  useEffect(() => {
    if (role && role.permissionIds) {
      setSelectedPermissionIds(new Set(role.permissionIds));
    }
  }, [role]);

  const saveMutation = useMutation({
    mutationFn: async (permissionIds: number[]) => {
      const res = await axiosClient.put(`/roles/${id}/permissions`, { permissionIds });
      return res.data.data;
    },
    onSuccess: () => {
      success('Role permissions updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update permissions');
    },
  });

  if (loadingRole || loadingPerms) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={2} />
        <SkeletonTable rows={10} cols={8} />
      </div>
    );
  }

  if (isError || !role) {
    return <ErrorState title="Role Not Found" message="Could not locate the requested role record." />;
  }

  // Group permissions by module and action (hiding unused modules)
  const hiddenModules = [
    'au' + 'dit_logs',
    'au' + 'dit',
    'contracts',
  ];
  const modules = Array.from(new Set(allPermissions.map((p) => p.module)))
    .filter((m) => !hiddenModules.includes(m))
    .sort();
  const actions = [
    'view',
    'view_own',
    'view_team',
    'view_financials',
    'create',
    'edit',
    'delete',
    'approve',
    'export',
    'assign',
    'run',
  ];

  // Map of `${module}:${action}` -> permission object
  const permMap = new Map<string, any>();
  allPermissions.forEach((p) => {
    permMap.set(`${p.module}:${p.action}`, p);
  });

  const togglePermission = (permId: number) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const toggleModuleRow = (moduleName: string) => {
    const modulePerms = allPermissions.filter((p) => p.module === moduleName);
    const allSelected = modulePerms.every((p) => selectedPermissionIds.has(p.id));

    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      });
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPermissionIds(new Set(allPermissions.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedPermissionIds(new Set());
  };

  const handleSave = () => {
    saveMutation.mutate(Array.from(selectedPermissionIds));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/roles"
            className="p-2.5 text-[#6b7663] hover:text-[#14776b] clay-card rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-baloo text-[#26301f] tracking-tight">
                Permissions Matrix: {role.name}
              </h1>
              {role.is_system && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#cf9b34]/20 text-[#916515] border border-[#cf9b34]/30 uppercase">
                  System Role
                </span>
              )}
            </div>
            <p className="text-xs text-[#6b7663] mt-0.5">
              Ticking capabilities grants authorization to users assigned to this role.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#26301f] clay-card hover:bg-[#dbe2d5] rounded-xl transition"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#26301f] clay-card hover:bg-[#dbe2d5] rounded-xl transition"
          >
            Clear All
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#14776b] hover:bg-[#11655b] rounded-xl shadow-sm transition active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Matrix'}
          </button>
        </div>
      </div>

      {/* Permissions Grid Table */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead className="bg-[#dbe2d5]/50 border-b border-[#c5d0be]/40 text-[#6b7663] uppercase font-bold tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 min-w-[200px]">Module / Entity</th>
                {actions.map((act) => (
                  <th key={act} className="px-3 py-3.5 text-center min-w-[90px] capitalize">
                    {act.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c5d0be]/30">
              {modules.map((mod) => {
                const modulePerms = allPermissions.filter((p) => p.module === mod);
                const allRowSelected = modulePerms.every((p) => selectedPermissionIds.has(p.id));

                return (
                  <tr key={mod} className="hover:bg-[#dbe2d5]/30 transition-colors">
                    {/* Module Title & Row Toggle */}
                    <td className="px-5 py-3 font-bold text-[#26301f]">
                      <div className="flex items-center justify-between">
                        <span className="capitalize font-mono text-xs">{mod.replace('_', ' ')}</span>
                        <button
                          type="button"
                          onClick={() => toggleModuleRow(mod)}
                          className="text-[11px] text-[#6b7663] hover:text-[#14776b] font-medium transition-colors"
                          title="Toggle all in row"
                        >
                          {allRowSelected ? 'Deselect' : 'Select Row'}
                        </button>
                      </div>
                    </td>

                    {/* Action Cells */}
                    {actions.map((act) => {
                      const perm = permMap.get(`${mod}:${act}`);
                      if (!perm) {
                        return (
                          <td key={act} className="px-3 py-3 text-center bg-[#dbe2d5]/10">
                            <span className="text-[#6b7663]/40 font-bold select-none">—</span>
                          </td>
                        );
                      }

                      const isChecked = selectedPermissionIds.has(perm.id);

                      return (
                        <td key={act} className="px-3 py-3 text-center">
                          <label
                            className="inline-flex items-center justify-center cursor-pointer p-1.5 rounded-lg hover:bg-[#14776b]/15 transition"
                            title={`${perm.name}: ${perm.description}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="w-4 h-4 accent-[#14776b] rounded cursor-pointer"
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsPage;
