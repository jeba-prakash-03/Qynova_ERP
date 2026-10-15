import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  MessageSquare,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  Briefcase,
} from 'lucide-react';
import { clientsApi } from '../api';
import { projectsApi } from '../../projects/api';
import {
  ClientWithDetails,
} from '../types';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { Can } from '../../../shared/components/Can';
import { SkeletonCard, SkeletonTable } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { EmptyState } from '../../../shared/components/EmptyState';
import { useToast } from '../../../shared/context/ToastContext';
import { formatCurrency } from '../../../shared/utils/format.util';

type TabType =
  | 'overview'
  | 'contacts'
  | 'addresses'
  | 'projects'
  | 'invoices'
  | 'documents'
  | 'communications';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Modals state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);

  // Form states for contact
  const [contactName, setContactName] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactIsPrimary, setContactIsPrimary] = useState(false);

  // Form states for address
  const [addrType, setAddrType] = useState<'billing' | 'office'>('office');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrCountry, setAddrCountry] = useState('India');

  // Form states for communication
  const [commType, setCommType] = useState<'call' | 'email' | 'meeting' | 'note'>('call');
  const [commSummary, setCommSummary] = useState('');
  const [commDate, setCommDate] = useState(new Date().toISOString().split('T')[0]);

  // Client Details Query
  const {
    data: client,
    isLoading,
    isError,
  } = useQuery<ClientWithDetails>({
    queryKey: ['client', id],
    queryFn: () => clientsApi.getById(id!),
    enabled: Boolean(id),
  });

  // Client Projects Query
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects', 'client', id],
    queryFn: () => projectsApi.getAll({ client_id: id }),
    enabled: Boolean(id) && activeTab === 'projects',
  });

  // Mutations
  const addContactMutation = useMutation({
    mutationFn: (payload: any) => clientsApi.addContact(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      success('Contact added successfully');
      setIsContactModalOpen(false);
      resetContactForm();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to add contact');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: number) => clientsApi.deleteContact(id!, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      success('Contact removed');
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: (payload: any) => clientsApi.addAddress(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      success('Address registered successfully');
      setIsAddressModalOpen(false);
      resetAddressForm();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to add address');
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: number) => clientsApi.deleteAddress(id!, addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      success('Address removed');
    },
  });

  const addCommMutation = useMutation({
    mutationFn: (payload: any) => clientsApi.addCommunication(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      success('Communication logged successfully');
      setIsCommModalOpen(false);
      resetCommForm();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to log communication');
    },
  });

  const deleteCommMutation = useMutation({
    mutationFn: (commId: number) => clientsApi.deleteCommunication(id!, commId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      success('Communication log removed');
    },
  });

  const resetContactForm = () => {
    setContactName('');
    setContactDesignation('');
    setContactEmail('');
    setContactPhone('');
    setContactIsPrimary(false);
  };

  const resetAddressForm = () => {
    setAddrType('office');
    setAddrLine1('');
    setAddrLine2('');
    setAddrCity('');
    setAddrState('');
    setAddrPincode('');
    setAddrCountry('India');
  };

  const resetCommForm = () => {
    setCommType('call');
    setCommSummary('');
    setCommDate(new Date().toISOString().split('T')[0]);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Client Not Accessible"
          message="This client record either does not exist or you do not have permission to view it."
        />
        <div className="text-center">
          <Link
            to="/clients"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'contacts', label: 'Contacts', count: client.contacts?.length },
    { key: 'addresses', label: 'Addresses', count: client.addresses?.length },
    { key: 'projects', label: 'Projects', count: client.projects_count },
    { key: 'invoices', label: 'Invoices' },
    { key: 'documents', label: 'Documents' },
    {
      key: 'communications',
      label: 'Communication History',
      count: client.communications?.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b7663] hover:text-[#14776b] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clients Directory
        </Link>
      </div>

      {/* Header Card */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#14776b]/15 text-[#14776b] rounded-2xl clay-card">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold clay-inset text-[#14776b] border border-[#14776b]/20">
                  {client.client_code}
                </span>
                <h1 className="text-2xl font-bold font-baloo text-[#26301f]">{client.company_name}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                    client.status === 'active'
                      ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
                      : client.status === 'lead'
                      ? 'bg-[#cf9b34]/15 text-[#916515] border-[#cf9b34]/30'
                      : 'bg-[#dbe2d5] text-[#6b7663] border-[#c5d0be]'
                  }`}
                >
                  {client.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#6b7663] mt-2">
                {client.industry && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#6b7663]/70" />
                    {client.industry}
                  </span>
                )}
                {client.website && (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-[#14776b] hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#6b7663]/70" />
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {client.gstin && (
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#6b7663]/70" />
                    GSTIN: {client.gstin}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="flex overflow-x-auto border-b border-[#c5d0be]/40 mt-6 -mb-6 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-180 ${
                activeTab === tab.key
                  ? 'border-[#14776b] text-[#14776b]'
                  : 'border-transparent text-[#6b7663] hover:text-[#26301f] hover:border-[#c5d0be]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === tab.key
                      ? 'bg-[#14776b]/15 text-[#14776b]'
                      : 'clay-inset text-[#6b7663]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Notes & Summary */}
            <div className="clay-card p-6 rounded-2xl border border-[#c5d0be]/50">
              <h3 className="text-base font-bold font-baloo text-[#26301f] mb-2">Account Overview</h3>
              <p className="text-sm text-[#26301f]/85 leading-relaxed whitespace-pre-line">
                {client.notes || 'No detailed account notes entered for this client.'}
              </p>
            </div>

            {/* Quick Contacts preview */}
            <div className="clay-card p-6 rounded-2xl border border-[#c5d0be]/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold font-baloo text-[#26301f]">Key Stakeholders</h3>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="text-xs font-semibold text-[#14776b] hover:underline"
                >
                  View All ({client.contacts?.length || 0})
                </button>
              </div>
              {client.contacts?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {client.contacts.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="clay-card-interactive bg-[#e2e8dc] p-3.5 rounded-xl border border-[#c5d0be]/40 flex items-start gap-3 transition-all duration-180"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#14776b]/20 text-[#14776b] font-bold flex items-center justify-center text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-[#26301f] flex items-center gap-1.5">
                          {c.name}
                          {c.is_primary && (
                            <span className="text-[10px] bg-[#cf9b34]/20 text-[#916515] px-1.5 py-0.2 rounded-md font-semibold">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-[#6b7663]">{c.designation || 'Stakeholder'}</div>
                        <div className="text-[#14776b] font-medium mt-1">{c.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6b7663]">No contacts recorded yet.</p>
              )}
            </div>
          </div>

          {/* Right Column: Office & Billing Addresses */}
          <div className="space-y-6">
            <div className="clay-card p-6 rounded-2xl border border-[#c5d0be]/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold font-baloo text-[#26301f]">Addresses</h3>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className="text-xs font-semibold text-[#14776b] hover:underline"
                >
                  Manage
                </button>
              </div>
              {client.addresses?.length > 0 ? (
                <div className="space-y-3.5">
                  {client.addresses.map((addr) => (
                    <div key={addr.id} className="clay-card-interactive bg-[#e2e8dc] p-3.5 border border-[#c5d0be]/40 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold capitalize text-[#14776b]">
                          {addr.type} Address
                        </span>
                      </div>
                      <p className="text-xs text-[#26301f]/85">
                        {addr.line1}
                        {addr.line2 && <>, {addr.line2}</>}
                        <br />
                        {addr.city}, {addr.state} - {addr.pincode}
                        <br />
                        {addr.country}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6b7663]">No addresses registered.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold font-baloo text-[#26301f]">Client Contacts & Stakeholders</h3>
            <Can permission="clients.edit">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-180"
              >
                <Plus className="w-3.5 h-3.5" /> Add Contact
              </button>
            </Can>
          </div>

          {client.contacts?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50 relative group transition-all duration-180"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#14776b]/20 text-[#14776b] font-bold flex items-center justify-center text-sm">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#26301f] flex items-center gap-2">
                          {contact.name}
                          {contact.is_primary && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-300">
                              Primary
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-[#6b7663]">{contact.designation || 'Member'}</p>
                      </div>
                    </div>
                    <Can permission="clients.edit">
                      <button
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                        className="text-[#6b7663] hover:text-[#c4643f] hover:bg-[#c4643f]/10 transition-colors p-1 rounded-lg"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Can>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#c5d0be]/40 space-y-1.5 text-xs text-[#6b7663]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#6b7663]/70" />
                      <a href={`mailto:${contact.email}`} className="hover:underline text-[#14776b] font-medium">
                        {contact.email}
                      </a>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#6b7663]/70" />
                        <span className="text-[#26301f]">{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Contacts"
              description="No stakeholders or point of contacts recorded yet for this client."
              action={{
                label: 'Add First Contact',
                onClick: () => setIsContactModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* 3. ADDRESSES TAB */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold font-baloo text-[#26301f]">Registered Addresses</h3>
            <Can permission="clients.edit">
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-180"
              >
                <Plus className="w-3.5 h-3.5" /> Add Address
              </button>
            </Can>
          </div>

          {client.addresses?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50 flex items-start justify-between transition-all duration-180"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-[#14776b]/15 text-[#14776b] rounded-xl clay-card mt-0.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wider clay-inset text-[#26301f] border border-[#c5d0be]/40">
                        {addr.type} Address
                      </span>
                      <p className="text-sm font-semibold text-[#26301f] mt-2.5">
                        {addr.line1}
                        {addr.line2 && <br />}
                        {addr.line2}
                      </p>
                      <p className="text-xs text-[#6b7663] mt-1">
                        {addr.city}, {addr.state} - {addr.pincode}
                        <br />
                        {addr.country}
                      </p>
                    </div>
                  </div>
                  <Can permission="clients.edit">
                    <button
                      onClick={() => deleteAddressMutation.mutate(addr.id)}
                      className="text-[#6b7663] hover:text-[#c4643f] hover:bg-[#c4643f]/10 transition-colors p-1 rounded-lg"
                      title="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Can>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Addresses"
              description="No office or billing addresses recorded for this client."
              action={{
                label: 'Add Address',
                onClick: () => setIsAddressModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* 4. PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold font-baloo text-[#26301f]">Client Projects</h3>
            <Can permission="projects.create">
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-180"
              >
                <Plus className="w-3.5 h-3.5" /> New Project
              </Link>
            </Can>
          </div>

          {loadingProjects ? (
            <SkeletonTable rows={4} cols={4} />
          ) : projectsData && projectsData.data && projectsData.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectsData.data.map((proj: any) => (
                <Link
                  key={proj.id}
                  to={`/projects/${proj.id}`}
                  className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50 block group transition-all duration-180"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg clay-inset text-[#14776b] border border-[#14776b]/20">
                      {proj.project_code}
                    </span>
                    <span className="text-xs font-semibold capitalize px-2.5 py-0.5 rounded-full clay-inset text-[#26301f] border border-[#c5d0be]/40">
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[#26301f] group-hover:text-[#14776b] transition-colors mt-2.5">
                    {proj.name}
                  </h4>

                  <div className="mt-3 text-xs text-[#6b7663] flex items-center justify-between pt-2 border-t border-[#c5d0be]/40">
                    <div>
                      PM:{' '}
                      <span className="font-semibold text-[#26301f]">
                        {proj.project_manager_name || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      Budget:{' '}
                      <span className="font-bold font-mono text-[#26301f]">
                        {formatCurrency(proj.budget)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Projects Yet"
              description="No projects have been initiated for this client."
            />
          )}
        </div>
      )}

      {/* 5. INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="clay-card p-8 rounded-2xl border border-[#c5d0be]/50 text-center">
          <div className="w-12 h-12 bg-[#cf9b34]/15 text-[#916515] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-baloo text-[#26301f]">Invoices & Financial Ledger</h3>
          <p className="text-sm text-[#6b7663] max-w-md mx-auto mt-1">
            Client billing statements, milestone disbursements, and tax credit tracking are
            managed through the dedicated Invoices module.
          </p>
          <div className="mt-4">
            <Link
              to="/invoices"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white text-xs font-semibold rounded-xl transition-all duration-180 shadow-sm"
            >
              Open Invoices
            </Link>
          </div>
        </div>
      )}

      {/* 6. DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="clay-card p-8 rounded-2xl border border-[#c5d0be]/50 text-center">
          <div className="w-12 h-12 bg-[#22304a]/15 text-[#22304a] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-baloo text-[#26301f]">Client Document Repository</h3>
          <p className="text-sm text-[#6b7663] max-w-md mx-auto mt-1">
            Master Service Agreements (MSAs), SOW documents, KYC certificates, and NDAs are
            archived securely in the company document repository.
          </p>
        </div>
      )}

      {/* 7. COMMUNICATIONS TAB */}
      {activeTab === 'communications' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold font-baloo text-[#26301f]">Communication History</h3>
            <Can permission="clients.edit">
              <button
                onClick={() => setIsCommModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-180"
              >
                <Plus className="w-3.5 h-3.5" /> Log Interaction
              </button>
            </Can>
          </div>

          {client.communications?.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#c5d0be]">
              {client.communications.map((comm) => {
                const iconMap: Record<string, any> = {
                  call: Phone,
                  email: Mail,
                  meeting: Calendar,
                  note: MessageSquare,
                };
                const IconComponent = iconMap[comm.type] || MessageSquare;

                return (
                  <div key={comm.id} className="relative group">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#e2e8dc] border-2 border-[#14776b] flex items-center justify-center text-[#14776b]">
                      <IconComponent className="w-2.5 h-2.5" />
                    </div>

                    <div className="clay-card-interactive bg-[#e2e8dc] p-4 rounded-2xl border border-[#c5d0be]/50 transition-all duration-180">
                      <div className="flex items-center justify-between text-xs text-[#6b7663] mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-wider text-[#14776b] bg-[#14776b]/15 px-2 py-0.5 rounded-lg text-[10px]">
                            {comm.type}
                          </span>
                          <span>{comm.date}</span>
                          <span>• Logged by {comm.creator_name || 'System User'}</span>
                        </div>
                        <Can permission="clients.edit">
                          <button
                            onClick={() => deleteCommMutation.mutate(comm.id)}
                            className="text-[#6b7663] hover:text-[#c4643f] hover:bg-[#c4643f]/10 transition-colors p-1 rounded-lg"
                            title="Remove log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                      </div>

                      <p className="text-sm text-[#26301f]/90 leading-relaxed mt-1">{comm.summary}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No Communication Logs"
              description="No interactions, calls, or meeting summaries recorded for this client."
              action={{
                label: 'Log First Communication',
                onClick: () => setIsCommModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Add Stakeholder Contact"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addContactMutation.mutate({
              name: contactName,
              designation: contactDesignation || null,
              email: contactEmail,
              phone: contactPhone || null,
              is_primary: contactIsPrimary,
            });
          }}
          className="space-y-4"
        >
          <FormField label="Full Name" required>
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </FormField>
          <FormField label="Designation / Role">
            <input
              type="text"
              value={contactDesignation}
              onChange={(e) => setContactDesignation(e.target.value)}
              className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </FormField>
          <FormField label="Email Address" required>
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </FormField>
          <FormField label="Phone Number">
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </FormField>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#26301f] cursor-pointer">
            <input
              type="checkbox"
              checked={contactIsPrimary}
              onChange={(e) => setContactIsPrimary(e.target.checked)}
              className="rounded accent-[#14776b]"
            />
            Mark as Primary Contact for this Client
          </label>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#c5d0be]/40">
            <button
              type="button"
              onClick={() => setIsContactModalOpen(false)}
              className="px-4 py-2 border border-[#c5d0be] text-[#26301f] hover:bg-[#dbe2d5]/60 rounded-xl text-xs font-semibold transition-all duration-180"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addContactMutation.isPending}
              className="px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all duration-180 shadow-sm"
            >
              {addContactMutation.isPending ? 'Saving...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Address Modal */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title="Register Address"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addAddressMutation.mutate({
              type: addrType,
              line1: addrLine1,
              line2: addrLine2 || null,
              city: addrCity,
              state: addrState,
              pincode: addrPincode,
              country: addrCountry,
            });
          }}
          className="space-y-4"
        >
          <FormField label="Address Type" required>
            <select
              value={addrType}
              onChange={(e: any) => setAddrType(e.target.value)}
              className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            >
              <option value="office">Office Address</option>
              <option value="billing">Billing Address</option>
            </select>
          </FormField>
          <FormField label="Street Address Line 1" required>
            <input
              type="text"
              required
              value={addrLine1}
              onChange={(e) => setAddrLine1(e.target.value)}
              className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </FormField>
          <FormField label="Line 2 (Building / Suite)">
            <input
              type="text"
              value={addrLine2}
              onChange={(e) => setAddrLine2(e.target.value)}
              className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="City" required>
              <input
                type="text"
                required
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              />
            </FormField>
            <FormField label="State" required>
              <input
                type="text"
                required
                value={addrState}
                onChange={(e) => setAddrState(e.target.value)}
                className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Postal Code / PIN" required>
              <input
                type="text"
                required
                value={addrPincode}
                onChange={(e) => setAddrPincode(e.target.value)}
                className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              />
            </FormField>
            <FormField label="Country" required>
              <input
                type="text"
                required
                value={addrCountry}
                onChange={(e) => setAddrCountry(e.target.value)}
                className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#c5d0be]/40">
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(false)}
              className="px-4 py-2 border border-[#c5d0be] text-[#26301f] hover:bg-[#dbe2d5]/60 rounded-xl text-xs font-semibold transition-all duration-180"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addAddressMutation.isPending}
              className="px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all duration-180 shadow-sm"
            >
              {addAddressMutation.isPending ? 'Saving...' : 'Add Address'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Communication Modal */}
      <Modal
        isOpen={isCommModalOpen}
        onClose={() => setIsCommModalOpen(false)}
        title="Log Communication History"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addCommMutation.mutate({
              type: commType,
              summary: commSummary,
              date: commDate,
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Interaction Type" required>
              <select
                value={commType}
                onChange={(e: any) => setCommType(e.target.value)}
                className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              >
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Internal Note</option>
              </select>
            </FormField>
            <FormField label="Date" required>
              <input
                type="date"
                required
                value={commDate}
                onChange={(e) => setCommDate(e.target.value)}
                className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              />
            </FormField>
          </div>

          <FormField label="Discussion Summary & Action Items" required>
            <textarea
              required
              rows={3}
              value={commSummary}
              onChange={(e) => setCommSummary(e.target.value)}
              placeholder="Detailed notes on discussion, decisions, and follow-ups..."
              className="w-full px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </FormField>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#c5d0be]/40">
            <button
              type="button"
              onClick={() => setIsCommModalOpen(false)}
              className="px-4 py-2 border border-[#c5d0be] text-[#26301f] hover:bg-[#dbe2d5]/60 rounded-xl text-xs font-semibold transition-all duration-180"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addCommMutation.isPending}
              className="px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all duration-180 shadow-sm"
            >
              {addCommMutation.isPending ? 'Logging...' : 'Save Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
