import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { Project, ProjectPriority, ProjectStatus } from '../types';
import { X } from 'lucide-react';

const projectFormSchema = z.object({
  client_id: z.number({ invalid_type_error: 'Client selection is required' }).int().positive(),
  name: z.string().min(2, 'Project name is required').max(255),
  description: z.string().optional().nullable(),
  project_manager_id: z.number().optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD start date required'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date required').or(z.string().length(0)).optional().nullable(),
  budget: z.number().nonnegative('Budget must be positive or zero'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum([
    'lead',
    'proposal',
    'won',
    'contract',
    'planning',
    'development',
    'testing',
    'uat',
    'deployment',
    'maintenance',
    'completed',
    'on_hold',
    'cancelled',
  ]),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  project?: Project | null;
  isLoading?: boolean;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project,
  isLoading = false,
}) => {
  const isEditing = Boolean(project);
  const [techInput, setTechInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>([]);

  // Fetch clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'select-options'],
    queryFn: async () => {
      const res = await axiosClient.get('/clients?limit=100');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Fetch active employees for PM dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'active-select-options'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200&status=active');
      const list: any[] = res.data?.data || [];
      return list.filter((e) => e.status === 'active' && e.lifecycle_stage !== 'relieved');
    },
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      client_id: undefined,
      name: '',
      description: '',
      project_manager_id: undefined,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      budget: 0,
      priority: 'medium',
      status: 'planning',
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        client_id: project.client_id,
        name: project.name,
        description: project.description || '',
        project_manager_id: project.project_manager_id || undefined,
        start_date: project.start_date.split('T')[0],
        end_date: project.end_date ? project.end_date.split('T')[0] : '',
        budget: Number(project.budget) || 0,
        priority: project.priority,
        status: project.status,
      });
      setTechnologies(project.technologies || []);
    } else {
      reset({
        client_id: undefined,
        name: '',
        description: '',
        project_manager_id: undefined,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        budget: 0,
        priority: 'medium',
        status: 'planning',
      });
      setTechnologies(['React', 'TypeScript', 'Node.js']);
    }
  }, [project, reset, isOpen]);

  const addTechTag = () => {
    const trimmed = techInput.trim();
    if (trimmed && !technologies.includes(trimmed)) {
      setTechnologies([...technologies, trimmed]);
      setTechInput('');
    }
  };

  const removeTechTag = (tag: string) => {
    setTechnologies(technologies.filter((t) => t !== tag));
  };

  const handleFormSubmit = async (values: ProjectFormData) => {
    const payload: any = {
      ...values,
      technologies,
      end_date: values.end_date || null,
      project_manager_id: values.project_manager_id ? Number(values.project_manager_id) : null,
      client_id: Number(values.client_id),
      budget: Number(values.budget),
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Project: ${project?.name}` : 'Initiate New Project'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Client Account" required error={errors.client_id?.message}>
            <select
              {...register('client_id', { valueAsNumber: true })}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Client...</option>
              {clientsData?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.client_code} - {c.company_name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Project Manager" error={errors.project_manager_id?.message}>
            <select
              {...register('project_manager_id', {
                setValueAs: (v) => (v === '' ? null : Number(v)),
              })}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Project Manager...</option>
              {employeesData?.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} - {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Project Name" required error={errors.name?.message}>
          <input
            {...register('name')}
            type="text"
            placeholder="e.g. FinTech Core Banking Gateway"
            className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </FormField>

        <FormField label="Description & Scope" error={errors.description?.message}>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="High-level project objectives, deliverables, and scope statement..."
            className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Start Date" required error={errors.start_date?.message}>
            <input
              {...register('start_date')}
              type="date"
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>

          <FormField label="Target End Date" error={errors.end_date?.message}>
            <input
              {...register('end_date')}
              type="date"
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>

          <FormField label="Budget (₹ INR)" required error={errors.budget?.message}>
            <input
              {...register('budget', { valueAsNumber: true })}
              type="number"
              step="1000"
              placeholder="e.g. 500000"
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Priority" required error={errors.priority?.message}>
            <select
              {...register('priority')}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </select>
          </FormField>

          <FormField label="Initial Status" required error={errors.status?.message}>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="lead">Lead</option>
              <option value="proposal">Proposal</option>
              <option value="won">Won</option>
              <option value="contract">Contract</option>
              <option value="planning">Planning</option>
              <option value="development">Development</option>
              <option value="testing">Testing</option>
              <option value="uat">UAT</option>
              <option value="deployment">Deployment</option>
              <option value="maintenance">Maintenance</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
        </div>

        {/* Technologies Tag Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Technology Stack & Frameworks
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTechTag();
                }
              }}
              placeholder="e.g. React, Docker, Python (Press Enter to add)"
              className="flex-1 px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addTechTag}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 transition"
            >
              Add Tag
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {technologies.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-200"
              >
                {tech}
                <button
                  type="button"
                  onClick={() => removeTechTag(tech)}
                  className="hover:text-indigo-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
