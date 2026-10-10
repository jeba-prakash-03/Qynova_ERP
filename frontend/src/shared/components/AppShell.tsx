import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, getRoleRedirectPath } from '../context/AuthContext';
import { MENU_CONFIG } from '../navigation/menuConfig';
import { NotificationBell } from '../../features/notifications/NotificationBell';
import {
  Menu,
  X,
  LogOut,
  KeyRound,
  Shield,
  User,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const isAdmin = user.roles?.includes('Admin');
  const isHR = user.roles?.includes('HR');
  const isManager = user.roles?.includes('Manager');
  const hasEmployee = Boolean(user.employee);

  const userDashboardPath = getRoleRedirectPath(user);

  // Filter menu items according to user permissions and employee status
  const visibleMenuGroups = MENU_CONFIG.map((group) => {
    const visibleItems = group.items
      .map((item) => {
        if (item.path === '/dashboard') {
          return { ...item, path: userDashboardPath };
        }
        return item;
      })
      .filter((item) => {
        // 1. Employee requirement check
        if (item.requireEmployee && !hasEmployee) {
          return false;
        }

        // 2. Admin dashboard check
        if (item.adminOnly && !isAdmin && !isHR) {
          return false;
        }

        // 3. Manager dashboard check
        if (item.managerOnly && !isManager && !isAdmin) {
          return false;
        }

        // 4. Permission check
        if (item.permission) {
          if (isAdmin) return true;
          return user.permissions?.includes(item.permission);
        }

        return true;
      });

    return {
      groupTitle: group.groupTitle,
      items: visibleItems,
    };
  }).filter((group) => group.items.length > 0);

  const userInitial = user.employee?.first_name?.charAt(0) || user.email.charAt(0).toUpperCase();
  const displayName = user.employee
    ? `${user.employee.first_name} ${user.employee.last_name}`
    : user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                QYNOVA
              </span>
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                ERP
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationBell />

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user.employee?.photo_url ? (
                  <img
                    src={user.employee.photo_url}
                    alt="avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  userInitial
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {user.roles?.[0] || 'User'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-1"
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {user.roles.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-600"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="py-1">
                  {hasEmployee && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/me');
                      }}
                      className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      My Profile
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/change-password');
                    }}
                    className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    Change Password
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-xs text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Overlay on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 top-16' : '-translate-x-full'
          }`}
        >
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {visibleMenuGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {group.groupTitle}
                </h4>
                <div className="space-y-0.5 pt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Environment Tag */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-600">Qynova ERP</span>
            <span>v1.0.0</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
