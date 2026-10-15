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
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#14776b]/15 text-[#14776b] rounded-xl clay-card">
          <Sliders className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-baloo text-[#26301f] tracking-tight">
            System Settings & Policies
          </h1>
          <p className="text-sm text-[#6b7663]">
            Configure organization branding, work schedules, leave quotas, statutory rules, and notification defaults.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#c5d0be]/40 gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-180 ${
                isActive
                  ? 'border-[#14776b] text-[#14776b] bg-[#14776b]/10 rounded-t-xl'
                  : 'border-transparent text-[#6b7663] hover:text-[#26301f] hover:border-[#c5d0be]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#14776b]' : 'text-[#6b7663]'}`} />
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
