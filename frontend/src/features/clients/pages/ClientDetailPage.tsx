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
  Clock,
  Briefcase,
  Layers,
  Send,
  User,
} from 'lucide-react';
import { clientsApi } from '../api';
import { projectsApi } from '../../projects/api';
import {
  ClientWithDetails,
  ClientContact,
  ClientAddress,
  ClientCommunication,
} from '../types';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { Can } from '../../../shared/components/Can';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { EmptyState } from '../../../shared/components/EmptyState';
import { useToast } from '../../../shared/context/ToastContext';

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
      success('Address added successfully');
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
      success('Communication log added');
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
      success('Communication entry removed');
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
      <div className="py-20 flex justify-center">
        <Loader text="Loading client details..." />
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Client Not Found"
          message="The client account you requested could not be located or may have been deleted."
        />
        <div className="text-center">
          <Link
            to="/clients"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
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
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clients Directory
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {client.client_code}
                </span>
                <h1 className="text-2xl font-bold text-slate-900">{client.company_name}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                    client.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : client.status === 'lead'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {client.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                {client.industry && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {client.industry}
                  </span>
                )}
                {client.website && (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-indigo-600 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {client.gstin && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    GSTIN: {client.gstin}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="flex overflow-x-auto border-b border-slate-200 mt-6 -mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600'
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
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-2">Account Overview</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {client.notes || 'No detailed account notes entered for this client.'}
              </p>
            </div>

            {/* Quick Contacts preview */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Key Stakeholders</h3>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  View All ({client.contacts?.length || 0})
                </button>
              </div>
              {client.contacts?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {client.contacts.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {c.name}
                          {c.is_primary && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500">{c.designation || 'Stakeholder'}</div>
                        <div className="text-slate-600 mt-1">{c.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No contacts recorded yet.</p>
              )}
            </div>
          </div>

          {/* Right Column: Office & Billing Addresses */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Addresses</h3>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Manage
                </button>
              </div>
              {client.addresses?.length > 0 ? (
                <div className="space-y-4">
                  {client.addresses.map((addr) => (
                    <div key={addr.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold capitalize text-indigo-700">
                          {addr.type} Address
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
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
                <p className="text-xs text-slate-400">No addresses registered.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Client Contacts & Stakeholders</h3>
            <Can permission="clients.edit">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm"
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
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          {contact.name}
                          {contact.is_primary && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Primary
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500">{contact.designation || 'Member'}</p>
                      </div>
                    </div>
                    <Can permission="clients.edit">
                      <button
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                        className="text-slate-400 hover:text-rose-600 transition p-1"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Can>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`mailto:${contact.email}`} className="hover:underline text-indigo-600">
                        {contact.email}
                      </a>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{contact.phone}</span>
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
            <h3 className="text-lg font-semibold text-slate-900">Registered Addresses</h3>
            <Can permission="clients.edit">
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm"
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
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mt-0.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {addr.type} Address
                      </span>
                      <p className="text-sm font-medium text-slate-800 mt-2">
                        {addr.line1}
                        {addr.line2 && <br />}
                        {addr.line2}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {addr.city}, {addr.state} - {addr.pincode}
                        <br />
                        {addr.country}
                      </p>
                    </div>
                  </div>
                  <Can permission="clients.edit">
                    <button
                      onClick={() => deleteAddressMutation.mutate(addr.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
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
            <h3 className="text-lg font-semibold text-slate-900">Client Projects</h3>
            <Can permission="projects.create">
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> New Project
              </Link>
            </Can>
          </div>

          {loadingProjects ? (
            <Loader text="Loading client projects..." />
          ) : projectsData && projectsData.data && projectsData.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectsData.data.map((proj: any) => (
                <Link
                  key={proj.id}
                  to={`/projects/${proj.id}`}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {proj.project_code}
                    </span>
                    <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition mt-2">
                    {proj.name}
                  </h4>

                  <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
                    <div>
                      PM:{' '}
                      <span className="font-medium text-slate-700">
                        {proj.project_manager_name || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      Budget:{' '}
                      <span className="font-semibold text-slate-800">
                        ₹{Number(proj.budget).toLocaleString()}
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
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Invoices & Financial Ledger</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Client billing statements, milestone disbursements, and tax credit tracking are
            managed through the dedicated Invoices module.
          </p>
          <div className="mt-4">
            <Link
              to="/invoices"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-200 transition-colors"
            >
              Open Invoices
            </Link>
          </div>
        </div>
      )}

      {/* 6. DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Client Document Repository</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Master Service Agreements (MSAs), SOW documents, KYC certificates, and NDAs are
            archived securely in the company document repository.
          </p>
        </div>
      )}

      {/* 7. COMMUNICATIONS TAB */}
      {activeTab === 'communications' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Communication History</h3>
            <Can permission="clients.edit">
              <button
                onClick={() => setIsCommModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Log Interaction
              </button>
            </Can>
          </div>

          {client.communications?.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
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
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-indigo-600">
                      <IconComponent className="w-2.5 h-2.5" />
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                            {comm.type}
                          </span>
                          <span>{comm.date}</span>
                          <span>• Logged by {comm.creator_name || 'System User'}</span>
                        </div>
                        <Can permission="clients.edit">
                          <button
                            onClick={() => deleteCommMutation.mutate(comm.id)}
                            className="text-slate-400 hover:text-rose-600 transition p-1"
                            title="Remove log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed mt-1">{comm.summary}</p>
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
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>
          <FormField label="Designation / Role">
            <input
              type="text"
              value={contactDesignation}
              onChange={(e) => setContactDesignation(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>
          <FormField label="Email Address" required>
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>
          <FormField label="Phone Number">
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={contactIsPrimary}
              onChange={(e) => setContactIsPrimary(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Mark as Primary Contact for this Client
          </label>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsContactModalOpen(false)}
              className="px-3 py-1.5 border rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addContactMutation.isPending}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold disabled:opacity-50"
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
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>
          <FormField label="Line 2 (Building / Suite)">
            <input
              type="text"
              value={addrLine2}
              onChange={(e) => setAddrLine2(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="City" required>
              <input
                type="text"
                required
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>
            <FormField label="State" required>
              <input
                type="text"
                required
                value={addrState}
                onChange={(e) => setAddrState(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>
            <FormField label="Country" required>
              <input
                type="text"
                required
                value={addrCountry}
                onChange={(e) => setAddrCountry(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(false)}
              className="px-3 py-1.5 border rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addAddressMutation.isPending}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold disabled:opacity-50"
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
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsCommModalOpen(false)}
              className="px-3 py-1.5 border rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addCommMutation.isPending}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold disabled:opacity-50"
            >
              {addCommMutation.isPending ? 'Logging...' : 'Save Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
