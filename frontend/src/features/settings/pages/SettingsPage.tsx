import React, { useState } from 'react';
import { CompanyTab } from '../components/CompanyTab';
import { WorkAttendanceTab } from '../components/WorkAttendanceTab';
import { LeavePolicyTab } from '../components/LeavePolicyTab';
import { PayrollTab } from '../components/PayrollTab';
import { OfferLetterTab } from '../components/OfferLetterTab';
import { NotificationSettingsPage } from '../../notifications/pages/NotificationSettingsPage';
import {
  Building2,
  Clock,
  CalendarDays,
  Banknote,
  FileText,
  Bell,
  Sliders,
} from 'lucide-react';

type TabKey = 'company' | 'work' | 'leave' | 'payroll' | 'offer_letter' | 'notifications';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('company');
  const [isCurrentTabDirty, setIsCurrentTabDirty] = useState(false);

  const handleTabChange = (newTab: TabKey) => {
    if (newTab === activeTab) return;
    if (isCurrentTabDirty) {
      const confirmLeave = window.confirm(
        'You have unsaved changes in this tab. Are you sure you want to discard them and switch tabs?'
      );
      if (!confirmLeave) return;
    }
    setActiveTab(newTab);
    setIsCurrentTabDirty(false);
  };

  const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
    { key: 'company', label: 'Company Profile', icon: Building2 },
    { key: 'work', label: 'Work & Attendance', icon: Clock },
    { key: 'leave', label: 'Leave Policy', icon: CalendarDays },
    { key: 'payroll', label: 'Payroll & PF', icon: Banknote },
    { key: 'offer_letter', label: 'Offer Letter', icon: FileText },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-indigo-600" />
          System Settings & Policies
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure organization branding, work schedules, leave quotas, statutory rules, and notification defaults.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === 'company' && <CompanyTab onDirtyChange={setIsCurrentTabDirty} />}
        {activeTab === 'work' && <WorkAttendanceTab onDirtyChange={setIsCurrentTabDirty} />}
        {activeTab === 'leave' && <LeavePolicyTab onDirtyChange={setIsCurrentTabDirty} />}
        {activeTab === 'payroll' && <PayrollTab onDirtyChange={setIsCurrentTabDirty} />}
        {activeTab === 'offer_letter' && <OfferLetterTab />}
        {activeTab === 'notifications' && <NotificationSettingsPage />}
      </div>
    </div>
  );
};

export default SettingsPage;
