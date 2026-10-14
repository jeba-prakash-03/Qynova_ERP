import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../shared/api/axiosClient';
import { Loader } from '../../shared/components/Loader';
import { ErrorState } from '../../shared/components/ErrorState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import {
  User,
  CreditCard,
  PhoneCall,
  FileText,
  CheckSquare,
  ArrowUpRight,
  LayoutDashboard,
  Download,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { Button } from '../../shared/components/Button';
import DOMPurify from 'dompurify';
import {
  EmployeeTodayAttendanceWidget,
  EmployeeLeaveBalancesWidget,
  EmployeeRecentItemsWidget,
} from './widgets/EmployeeDashboardWidgets';

export const EmployeeDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'profile' | 'bank' | 'emergency' | 'documents'>('overview');

  const { data: employee, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', 'me'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees/me');
      return res.data.data;
    },
  });

  const [offerPreviewOpen, setOfferPreviewOpen] = useState(false);

  const { data: myTasks } = useQuery({
    queryKey: ['dashboard', 'widget', 'my_tasks'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/dashboard/widgets/my_tasks');
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
  });

  const { data: myOfferLetter } = useQuery({
    queryKey: ['offer-letters', 'my'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/offer-letters/my');
        return res.data?.data || null;
      } catch {
        return null;
      }
    },
  });

  const downloadMyOfferPdf = async (letterId: number, refNo: string) => {
    try {
      const res = await axiosClient.get(`/offer-letters/${letterId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Offer_Letter_${refNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      alert('Failed to download offer letter PDF');
    }
  };

  if (isLoading) {
    return <Loader size="lg" text="Loading your employee profile..." />;
  }

  if (error || !employee) {
    return (
      <ErrorState
        title="Profile Unavailable"
        message="Unable to load employee profile. If you are an Admin without an employee profile, this view is restricted."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Hero */}
      <div className="bg-[#e2e8dc] rounded-[26px] p-6 sm:p-8 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-[20px] bg-[#14776b] flex items-center justify-center text-white text-2xl font-bold shrink-0 font-display shadow-[4px_5px_12px_rgba(20,119,107,0.35)]">
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt="avatar"
                className="w-full h-full rounded-[20px] object-cover"
              />
            ) : (
              `${employee.first_name[0]}${employee.last_name[0]}`
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[#26301f] font-display">
                {employee.first_name} {employee.last_name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-[8px] font-bold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.16)]">
                {employee.employee_code}
              </span>
              <StatusBadge status={employee.lifecycle_stage} />
            </div>
            <p className="text-xs sm:text-sm text-[#6b7663] mt-1 flex items-center gap-2 flex-wrap">
              <span>{employee.designation_name || 'Designation Pending'}</span>
              <span>•</span>
              <span>{employee.department_name || 'Department Pending'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end text-xs text-[#6b7663] gap-1 bg-[#dbe2d5] px-5 py-3.5 rounded-[18px] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]">
          <span className="font-bold text-[#26301f] font-display">Joined Company</span>
          <span className="font-medium tabular-nums">{new Date(employee.joining_date).toLocaleDateString()}</span>
          <span className="capitalize text-[11px] text-[#6b7663]">{employee.employment_type?.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Navigation Tabs (Clay Segmented Control) */}
      <div className="flex bg-[#dbe2d5] p-1.5 rounded-full border border-[rgba(76,91,70,0.14)] shadow-[inset_2px_3px_6px_rgba(104,118,100,0.18),inset_-2px_-2px_5px_rgba(255,255,255,0.7)] gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap rounded-full font-display ${
            activeTab === 'overview'
              ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.3)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/30'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Overview & Activity
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-2 px-4 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap rounded-full font-display ${
            activeTab === 'tasks'
              ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.3)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/30'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          My Tasks ({myTasks?.count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 px-4 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap rounded-full font-display ${
            activeTab === 'profile'
              ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.3)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/30'
          }`}
        >
          <User className="w-4 h-4" />
          General Profile
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`py-2 px-4 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap rounded-full font-display ${
            activeTab === 'bank'
              ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.3)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/30'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Bank Details
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`py-2 px-4 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap rounded-full font-display ${
            activeTab === 'emergency'
              ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.3)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/30'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          Emergency Contacts
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-2 px-4 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap rounded-full font-display ${
            activeTab === 'documents'
              ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.3)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/30'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <EmployeeTodayAttendanceWidget />
            </div>
            <div className="md:col-span-2">
              <EmployeeLeaveBalancesWidget />
            </div>
          </div>
          <div>
            <EmployeeRecentItemsWidget />
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] max-w-3xl">
          <div className="flex items-center justify-between border-b border-[rgba(76,91,70,0.12)] pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#26301f] font-display">
                My Assigned Tasks
              </h3>
              <p className="text-xs text-[#6b7663]">Tasks assigned to you pending completion</p>
            </div>
            <Link
              to="/tasks/my"
              className="text-xs font-bold text-[#14776b] hover:underline inline-flex items-center gap-1 font-display"
            >
              My Tasks Board <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {myTasks?.items?.length > 0 ? (
            <div className="divide-y divide-[rgba(76,91,70,0.12)]">
              {myTasks.items.map((t: any) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#26301f]">{t.task_code}</span>
                      <span className="font-semibold text-[#26301f]">{t.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.priority === 'urgent'
                            ? 'bg-[#f4ded6] text-[#c4643f] border border-[#c4643f]/30'
                            : t.priority === 'high'
                            ? 'bg-[#f7eed9] text-[#cf9b34] border border-[#cf9b34]/30'
                            : 'bg-[#dbe2d5] text-[#26301f]'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b7663] mt-0.5">
                      {t.project_name} • Due: {t.due_date || 'No due date'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#14776b]/15 text-[#14776b] border border-[#14776b]/30 capitalize">
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6b7663] py-6 text-center">No open tasks assigned to you right now.</p>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] space-y-4">
            <h3 className="text-sm font-bold text-[#26301f] font-display border-b border-[rgba(76,91,70,0.12)] pb-3">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6b7663] block mb-0.5">Work Email</span>
                <span className="font-semibold text-[#26301f]">{employee.email}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Phone</span>
                <span className="font-semibold text-[#26301f]">{employee.phone || '—'}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Date of Birth</span>
                <span className="font-semibold text-[#26301f] tabular-nums">{employee.date_of_birth || '—'}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Experience</span>
                <span className="font-semibold text-[#26301f]">{employee.experience_years} Years</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#6b7663] block mb-0.5">Address</span>
                <span className="font-semibold text-[#26301f]">{employee.address || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] space-y-4">
            <h3 className="text-sm font-bold text-[#26301f] font-display border-b border-[rgba(76,91,70,0.12)] pb-3">
              Work & Hierarchy
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6b7663] block mb-0.5">Department</span>
                <span className="font-semibold text-[#26301f]">{employee.department_name || '—'}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Designation</span>
                <span className="font-semibold text-[#26301f]">{employee.designation_name || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#6b7663] block mb-0.5">Reporting Manager</span>
                <span className="font-semibold text-[#26301f]">
                  {employee.reporting_manager_name || 'Direct / None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bank' && (
        <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] max-w-xl">
          <h3 className="text-sm font-bold text-[#26301f] font-display border-b border-[rgba(76,91,70,0.12)] pb-3 mb-4">
            Bank Details
          </h3>
          {employee.bank_details ? (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6b7663] block mb-0.5">Account Holder</span>
                <span className="font-semibold text-[#26301f]">{employee.bank_details.account_holder}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Bank Name</span>
                <span className="font-semibold text-[#26301f]">{employee.bank_details.bank_name}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Account Number</span>
                <span className="font-mono font-semibold text-[#26301f]">{employee.bank_details.account_number}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">IFSC Code</span>
                <span className="font-mono font-semibold text-[#26301f]">{employee.bank_details.ifsc}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6b7663] py-4">No bank details added.</p>
          )}
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] max-w-2xl">
          <h3 className="text-sm font-bold text-[#26301f] font-display border-b border-[rgba(76,91,70,0.12)] pb-3 mb-4">
            Emergency Contacts
          </h3>
          {employee.emergency_contacts && employee.emergency_contacts.length > 0 ? (
            <div className="divide-y divide-[rgba(76,91,70,0.12)]">
              {employee.emergency_contacts.map((contact: any, index: number) => (
                <div key={index} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-[#26301f]">{contact.contact_name}</span>
                    <span className="text-[#6b7663] ml-2">({contact.relationship})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-[#26301f]">{contact.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6b7663] py-4">No emergency contacts registered.</p>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Offer Letter Official Card */}
          <div className="bg-[#e2e8dc] rounded-[26px] p-6 sm:p-7 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(76,91,70,0.12)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[14px] bg-[#dbe2d5] text-[#14776b] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#14776b]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#26301f] font-display">Official Offer & Appointment Letter</h3>
                  <p className="text-xs text-[#6b7663]">Your binding employment contract issued by the organization.</p>
                </div>
              </div>
              {myOfferLetter && <StatusBadge status={myOfferLetter.status} />}
            </div>

            {myOfferLetter ? (
              <div className="p-5 rounded-[20px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#26301f] text-sm font-display">{myOfferLetter.reference_no}</span>
                    <span className="text-[10px] font-mono font-bold text-[#14776b] bg-[#14776b]/15 px-2 py-0.5 rounded border border-[#14776b]/20">
                      v{myOfferLetter.version}
                    </span>
                  </div>
                  <p className="text-[#35422d]">
                    Position: <strong className="text-[#26301f]">{myOfferLetter.designation}</strong> • Commencement: <strong className="text-[#26301f]">{myOfferLetter.joining_date}</strong>
                  </p>
                  <p className="text-[#6b7663] text-[11px] tabular-nums">
                    CTC: ₹{Number(myOfferLetter.annual_ctc || 0).toLocaleString('en-IN')} / annum • Valid Until: {myOfferLetter.offer_valid_until}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setOfferPreviewOpen(true)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View Letter
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadMyOfferPdf(myOfferLetter.id, myOfferLetter.reference_no)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download PDF
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#6b7663] space-y-1">
                <FileText className="w-8 h-8 text-[#6b7663]/60 mx-auto mb-2" />
                <p className="font-semibold text-[#26301f] font-display">No Offer Letter Available</p>
                <p>Your official offer letter will appear here once dispatched by Human Resources.</p>
              </div>
            )}
          </div>

          {/* Offer Letter Preview Modal */}
          {myOfferLetter && (
            <Modal
              isOpen={offerPreviewOpen}
              onClose={() => setOfferPreviewOpen(false)}
              title={`Offer Letter - ${myOfferLetter.reference_no}`}
              footer={
                <Button
                  size="sm"
                  onClick={() => downloadMyOfferPdf(myOfferLetter.id, myOfferLetter.reference_no)}
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download PDF
                </Button>
              }
            >
              <div className="p-4 bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] rounded-[20px] max-h-[60vh] overflow-y-auto space-y-4 text-xs font-sans shadow-[inset_1px_1px_4px_rgba(104,118,100,0.15)]">
                <div className="border-b border-[rgba(76,91,70,0.14)] pb-3">
                  <h4 className="text-base font-bold text-[#26301f] font-display">
                    {myOfferLetter.snapshot?.company_name || 'Qynova Technologies'}
                  </h4>
                  <p className="text-[#6b7663]">{myOfferLetter.snapshot?.company_address}</p>
                </div>
                <div
                  className="prose prose-sm max-w-none text-[#26301f] leading-relaxed text-xs space-y-2 font-sans"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(myOfferLetter.snapshot?.rendered_html || ''),
                  }}
                />
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
