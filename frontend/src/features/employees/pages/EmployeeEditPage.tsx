import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { FormField } from '../../../shared/components/FormField';
import { Loader } from '../../../shared/components/Loader';
import { useToast } from '../../../shared/context/ToastContext';
import { ArrowLeft, Save, Briefcase, User, CreditCard, PhoneCall } from 'lucide-react';

export const EmployeeEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const { data: employee, isLoading: loadingEmp } = useQuery({
    queryKey: ['employees', id],
    queryFn: async () => {
      const res = await axiosClient.get(`/employees/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments');
      return res.data.data;
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ['designations', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/designations');
      return res.data.data;
    },
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['employees', 'managers'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=100');
      return res.data.data;
    },
  });

  const [formData, setFormData] = useState<any>({
    first_name: '',
    last_name: '',
    photo_url: '',
    phone: '',
    date_of_birth: '',
    address: '',
    department_id: '',
    designation_id: '',
    reporting_manager_id: '',
    joining_date: '',
    employment_type: 'full_time',
    status: 'active',
    lifecycle_stage: 'active',
    skills: '',
    experience_years: '0',
    account_holder: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    contact_name: '',
    relationship: '',
    emergency_phone: '',
    alt_phone: '',
    emergency_address: '',
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        photo_url: employee.photo_url || '',
        phone: employee.phone || '',
        date_of_birth: employee.date_of_birth ? employee.date_of_birth.split('T')[0] : '',
        address: employee.address || '',
        department_id: employee.department_id || '',
        designation_id: employee.designation_id || '',
        reporting_manager_id: employee.reporting_manager_id || '',
        joining_date: employee.joining_date ? employee.joining_date.split('T')[0] : '',
        employment_type: employee.employment_type || 'full_time',
        status: employee.status || 'active',
        lifecycle_stage: employee.lifecycle_stage || 'active',
        skills: employee.skills ? employee.skills.join(', ') : '',
        experience_years: String(employee.experience_years || 0),
        account_holder: employee.bank_details?.account_holder || '',
        bank_name: employee.bank_details?.bank_name || '',
        account_number: employee.bank_details?.account_number || '',
        ifsc: employee.bank_details?.ifsc || '',
        contact_name: employee.emergency_contacts?.[0]?.contact_name || '',
        relationship: employee.emergency_contacts?.[0]?.relationship || '',
        emergency_phone: employee.emergency_contacts?.[0]?.phone || '',
        alt_phone: employee.emergency_contacts?.[0]?.alt_phone || '',
        emergency_address: employee.emergency_contacts?.[0]?.address || '',
      });
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await axiosClient.put(`/employees/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      success('Employee profile updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
      navigate(`/employees/${id}`);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update employee details');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      photo_url: formData.photo_url || null,
      phone: formData.phone || null,
      date_of_birth: formData.date_of_birth || null,
      address: formData.address || null,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      designation_id: formData.designation_id ? Number(formData.designation_id) : null,
      reporting_manager_id: formData.reporting_manager_id ? Number(formData.reporting_manager_id) : null,
      joining_date: formData.joining_date,
      employment_type: formData.employment_type,
      status: formData.status,
      lifecycle_stage: formData.lifecycle_stage,
      skills: formData.skills ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
      experience_years: parseFloat(formData.experience_years) || 0,
    };

    if (formData.account_number && formData.ifsc) {
      payload.bank_details = {
        account_holder: formData.account_holder || `${formData.first_name} ${formData.last_name}`,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        ifsc: formData.ifsc,
      };
    }

    if (formData.contact_name && formData.emergency_phone) {
      payload.emergency_contacts = [
        {
          contact_name: formData.contact_name,
          relationship: formData.relationship || 'Emergency Contact',
          phone: formData.emergency_phone,
          alt_phone: formData.alt_phone || null,
          address: formData.emergency_address || null,
        },
      ];
    }

    updateMutation.mutate(payload);
  };

  if (loadingEmp) {
    return <Loader size="lg" text="Loading employee profile..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          to={`/employees/${id}`}
          className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Edit Employee: {employee?.employee_code}
          </h1>
          <p className="text-xs text-slate-500">Update personal, work, bank, and emergency particulars</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Last Name" required>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Phone Number">
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Date of Birth">
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Photo URL">
              <input
                type="url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Experience (Years)">
              <input
                type="number"
                step="0.5"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Address">
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </FormField>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Work Placement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Department">
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">None</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Designation">
              <select
                value={formData.designation_id}
                onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">None</option>
                {designations.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Reporting Manager">
              <select
                value={formData.reporting_manager_id}
                onChange={(e) => setFormData({ ...formData, reporting_manager_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">None</option>
                {managers
                  .filter((m: any) => m.id !== Number(id))
                  .map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.employee_code})
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField label="Employment Type">
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="full_time">Full Time</option>
                <option value="intern">Intern</option>
                <option value="contract">Contract</option>
              </select>
            </FormField>

            <FormField label="Status">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>

            <FormField label="Skills">
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="Comma separated"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to={`/employees/${id}`}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeEditPage;
