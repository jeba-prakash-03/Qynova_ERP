import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ExternalLink, Info, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';
import axiosClient from '../../shared/api/axiosClient';

interface NotificationItem {
  id: number;
  user_id: number;
  event_key: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Poll unread count every 30 seconds
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await axiosClient.get('/notifications/unread-count');
      return res.data.data.count as number;
    },
    refetchInterval: 30000,
  });

  // Query notifications list when dropdown is open
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const res = await axiosClient.get('/notifications?limit=10');
      return res.data.data as NotificationItem[];
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 15000 : false,
  });

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = countData || 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-[#3f8f4a]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#cf9b34]" />;
      case 'danger':
        return <AlertOctagon className="w-4 h-4 text-[#c4643f]" />;
      default:
        return <Info className="w-4 h-4 text-[#14776b]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full text-[#35422d] hover:text-[#26301f] bg-[#e2e8dc] hover:bg-[#dbe2d5] border border-[rgba(76,91,70,0.16)] shadow-[3px_4px_10px_rgba(88,104,84,0.18),-2px_-2px_6px_rgba(255,255,255,0.85)] active:shadow-[inset_2px_2px_4px_rgba(88,104,84,0.25)] transition focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-[#c4643f] rounded-full ring-2 ring-[#e2e8dc] shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#e2e8dc] rounded-[24px] shadow-[12px_16px_36px_rgba(50,65,45,0.30),-8px_-8px_20px_rgba(255,255,255,0.85)] border border-[rgba(76,91,70,0.18)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3.5 border-b border-[rgba(76,91,70,0.12)] flex items-center justify-between bg-[#dbe2d5]/60">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-[#26301f]">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#14776b] text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-[#14776b] hover:text-[#106258] font-bold flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[rgba(76,91,70,0.10)]">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#6b7663]">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#6b7663]">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition flex gap-3 text-left ${
                    !n.is_read ? 'bg-[#dbe2d5]/60 hover:bg-[#dbe2d5]' : 'hover:bg-[#dbe2d5]/40'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#26301f] leading-snug">{n.title}</h4>
                      {!n.is_read && (
                        <button
                          onClick={() => markReadMutation.mutate(n.id)}
                          className="text-[10px] text-[#14776b] hover:underline font-bold shrink-0"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#6b7663] mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-[#6b7663]">
                      <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {n.link && (
                        <a
                          href={n.link}
                          className="text-[#14776b] hover:underline font-bold flex items-center gap-0.5"
                        >
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
