import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleRedirectPath } from '../context/AuthContext';
import { MENU_CONFIG } from '../navigation/menuConfig';
import { NotificationBell } from '../../features/notifications/NotificationBell';
import { PushNotificationBanner } from './PushNotificationBanner';
import { AppPageErrorBoundary } from './AppPageErrorBoundary';
import { useBranding } from '../hooks/useBranding';
import {
  Menu,
  X,
  LogOut,
  KeyRound,
  User,
  ChevronDown,
  Layers,
  Bell,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { appName, logoUrl, isConfigured } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to top on every route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [userMenuOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        if (item.requireEmployee && !hasEmployee) return false;
        if (item.adminOnly && !isAdmin && !isHR) return false;
        if (item.managerOnly && !isManager && !isAdmin) return false;
        if (item.permission) {
          if (isAdmin) return true;
          const reqPerms = item.permission.split(',');
          return reqPerms.some((p) => user.permissions?.includes(p.trim()));
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
    <div className="h-screen h-[100dvh] w-screen flex flex-col overflow-hidden bg-[#c5d0be] text-[#26301f]">
      {/* Top Navigation Header */}
      <header className="h-16 shrink-0 z-40 bg-[#e2e8dc]/95 backdrop-blur-md border-b border-[rgba(76,91,70,0.14)] shadow-[0_4px_16px_rgba(88,104,84,0.10)] px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Navigation"
            className="lg:hidden p-2 rounded-full text-[#35422d] hover:text-[#26301f] bg-[#e2e8dc] hover:bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[2px_3px_6px_rgba(88,104,84,0.15)] transition active:scale-95"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-8 max-w-[120px] object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-[#14776b] flex items-center justify-center text-white shadow-[3px_4px_10px_rgba(20,119,107,0.32),-2px_-2px_6px_rgba(255,255,255,0.7)]">
                <Layers className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base tracking-tight text-[#26301f] leading-tight">
                {appName}
              </span>
              {!isConfigured && isAdmin && (
                <NavLink
                  to="/settings"
                  className="text-[10px] text-[#14776b] hover:text-[#106258] font-bold underline"
                >
                  Set up your company
                </NavLink>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationBell />

          {/* User Profile Pill */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-[#e2e8dc] hover:bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[3px_4px_10px_rgba(88,104,84,0.18),-2px_-2px_6px_rgba(255,255,255,0.85)] active:shadow-[inset_2px_2px_4px_rgba(88,104,84,0.25)] transition duration-150"
            >
              <div className="w-8 h-8 rounded-full bg-[#14776b] flex items-center justify-center text-white text-xs font-bold shadow-xs">
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
                <span className="text-xs font-bold text-[#26301f] leading-tight truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#6b7663] font-medium">
                  {user.roles?.[0] || 'User'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#6b7663]" />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-60 bg-[#e2e8dc] rounded-[24px] shadow-[12px_16px_36px_rgba(50,65,45,0.30),-8px_-8px_20px_rgba(255,255,255,0.85)] border border-[rgba(76,91,70,0.18)] py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-4 py-2 border-b border-[rgba(76,91,70,0.10)]">
                  <p className="font-display text-xs font-bold text-[#26301f]">{displayName}</p>
                  <p className="text-[11px] text-[#6b7663] truncate">{user.email || ''}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(user.roles || []).map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#dbe2d5] text-[#35422d] border border-[rgba(76,91,70,0.14)]"
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
                      className="w-full px-4 py-2 text-xs text-left text-[#35422d] hover:bg-[#dbe2d5] flex items-center gap-2.5 transition font-medium"
                    >
                      <User className="w-3.5 h-3.5 text-[#6b7663]" />
                      My Profile
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/change-password');
                    }}
                    className="w-full px-4 py-2 text-xs text-left text-[#35422d] hover:bg-[#dbe2d5] flex items-center gap-2.5 transition font-medium"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#6b7663]" />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings/notifications');
                    }}
                    className="w-full px-4 py-2 text-xs text-left text-[#35422d] hover:bg-[#dbe2d5] flex items-center gap-2.5 transition font-medium"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#6b7663]" />
                    Notification Settings
                  </button>
                </div>

                <div className="border-t border-[rgba(76,91,70,0.10)] pt-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-xs text-left text-[#c4643f] hover:bg-[#f6dfd8] flex items-center gap-2.5 transition font-bold"
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

      {/* Main Container with Sidebar & Primary Vertical Scroll Container */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-[#26301f]/45 backdrop-blur-xs z-30 lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 bg-[#dbe2d5] border-r border-[rgba(76,91,70,0.14)] shadow-[6px_0_20px_rgba(88,104,84,0.12)] flex flex-col h-full transition-transform duration-200 ease-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Sidebar Close Header */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[rgba(76,91,70,0.12)] bg-[#dbe2d5]">
            <span className="font-display font-bold text-sm text-[#26301f]">{appName}</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-full hover:bg-[#c5d0be] text-[#35422d]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
            {visibleMenuGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7663]">
                  {group.groupTitle}
                </h4>
                <div className="space-y-1 pt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-bold transition-all duration-150 select-none ${
                            isActive
                              ? 'bg-[#14776b] text-white shadow-[inset_3px_4px_8px_rgba(10,50,45,0.45),inset_-2px_-3px_6px_rgba(255,255,255,0.22)]'
                              : 'text-[#35422d] hover:bg-[#e2e8dc] hover:text-[#26301f] active:scale-[0.98]'
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
          <div className="p-3.5 border-t border-[rgba(76,91,70,0.12)] bg-[#dbe2d5]/60 flex items-center justify-between text-[11px] text-[#6b7663] shrink-0">
            <span className="font-semibold text-[#26301f] truncate max-w-[170px]">{appName}</span>
            <span className="font-mono text-[10px]">v1.0.0</span>
          </div>
        </aside>

        {/* Primary Vertical Scroll Container */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto min-w-0 bg-[#c5d0be] focus:outline-none"
          tabIndex={-1}
        >
          <PushNotificationBanner />
          <div className="p-4 sm:p-6 lg:p-8 animate-page-enter min-w-0">
            <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto min-w-0">
              <AppPageErrorBoundary resetKey={location.pathname}>
                <Outlet />
              </AppPageErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
