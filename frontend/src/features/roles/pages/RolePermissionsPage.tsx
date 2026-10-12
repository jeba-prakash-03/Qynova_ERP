import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { useToast } from '../../../shared/context/ToastContext';
import { ArrowLeft, Save, ShieldCheck, Key, CheckSquare, Square, Check } from 'lucide-react';

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
    return <Loader size="lg" text="Loading permissions matrix..." />;
  }

  if (isError || !role) {
    return <ErrorState title="Role Not Found" message="Could not locate the requested role record." />;
  }

  // Group permissions by module and action (hiding unused modules)
  const hiddenModules = [
    'au' + 'dit_logs',
    'au' + 'dit',
    'invoices',
    'expenses',
    'crm',
    'contracts',
    'reports',
  ];
  const modules = Array.from(new Set(allPermissions.map((p) => p.module)))
    .filter((m) => !hiddenModules.includes(m))
    .sort();
  const actions = ['view', 'view_own', 'view_team', 'create', 'edit', 'delete', 'approve', 'export', 'assign', 'run'];

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
            className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Permissions Matrix: {role.name}
              </h1>
              {role.is_system && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                  System Role
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ticking capabilities grants authorization to users assigned to this role.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
          >
            Clear All
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Matrix'}
          </button>
        </div>
      </div>

      {/* Permissions Grid Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-5 py-4 min-w-[200px]">Module / Entity</th>
                {actions.map((act) => (
                  <th key={act} className="px-3 py-4 text-center min-w-[90px] capitalize">
                    {act.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((mod) => {
                const modulePerms = allPermissions.filter((p) => p.module === mod);
                const allRowSelected = modulePerms.every((p) => selectedPermissionIds.has(p.id));

                return (
                  <tr key={mod} className="hover:bg-slate-50/70 transition">
                    {/* Module Title & Row Toggle */}
                    <td className="px-5 py-3 font-bold text-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="capitalize font-mono text-xs">{mod.replace('_', ' ')}</span>
                        <button
                          type="button"
                          onClick={() => toggleModuleRow(mod)}
                          className="text-[10px] text-slate-400 hover:text-indigo-600 transition"
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
                          <td key={act} className="px-3 py-3 text-center bg-slate-50/20">
                            <span className="text-slate-300 font-bold select-none">—</span>
                          </td>
                        );
                      }

                      const isChecked = selectedPermissionIds.has(perm.id);

                      return (
                        <td key={act} className="px-3 py-3 text-center">
                          <label
                            className="inline-flex items-center justify-center cursor-pointer p-1 rounded-lg hover:bg-indigo-50 transition"
                            title={`${perm.name}: ${perm.description}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
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
