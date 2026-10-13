import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  FileText,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  Eye,
  Save,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Table as TableIcon,
  ChevronDown,
  Sparkles,
  AlertCircle,
  FileCode,
} from 'lucide-react';

export interface OfferLetterTemplate {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_VARIABLES = [
  { label: 'Company Name', value: '{{company_name}}' },
  { label: 'Company Address', value: '{{company_address}}' },
  { label: 'Letter Date', value: '{{letter_date}}' },
  { label: 'Reference Number', value: '{{reference_no}}' },
  { label: 'Employee Name', value: '{{employee_name}}' },
  { label: 'Employee Address', value: '{{employee_address}}' },
  { label: 'Designation', value: '{{designation}}' },
  { label: 'Department', value: '{{department}}' },
  { label: 'Joining Date', value: '{{joining_date}}' },
  { label: 'Employment Type', value: '{{employment_type}}' },
  { label: 'Monthly Gross Salary', value: '{{monthly_gross}}' },
  { label: 'Annual CTC', value: '{{annual_ctc}}' },
  { label: 'Salary Breakup Table', value: '{{salary_breakup_table}}' },
  { label: 'Probation Months', value: '{{probation_months}}' },
  { label: 'Reporting Manager', value: '{{reporting_manager}}' },
  { label: 'Work Location', value: '{{work_location}}' },
  { label: 'Working Hours', value: '{{working_hours}}' },
  { label: 'Notice Period Days', value: '{{notice_period_days}}' },
  { label: 'Offer Valid Until', value: '{{offer_valid_until}}' },
  { label: 'Signatory Name', value: '{{signatory_name}}' },
  { label: 'Signatory Designation', value: '{{signatory_designation}}' },
];

export const OfferLetterTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_html: '',
    is_default: false,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'editor' | 'preview'>('editor');

  // Fetch all templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['offer-letter-templates'],
    queryFn: async () => {
      const res = await axiosClient.get('/offer-letters/templates');
      return (res.data?.data || []) as OfferLetterTemplate[];
    },
  });

  const templates: OfferLetterTemplate[] = templatesData || [];

  useEffect(() => {
    if (templates.length > 0 && selectedTemplateId === null) {
      const def = templates.find((t: OfferLetterTemplate) => t.is_default) || templates[0];
      setSelectedTemplateId(def.id);
      setFormData({
        name: def.name,
        subject: def.subject,
        body_html: def.body_html,
        is_default: def.is_default,
      });
      setIsDirty(false);
    }
  }, [templates, selectedTemplateId]);

  const selectTemplate = (t: OfferLetterTemplate) => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard and switch template?')) {
      return;
    }
    setSelectedTemplateId(t.id);
    setFormData({
      name: t.name,
      subject: t.subject,
      body_html: t.body_html,
      is_default: t.is_default,
    });
    setIsDirty(false);
  };

  // Create Template Mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; subject: string; body_html: string; is_default: boolean }) => {
      const res = await axiosClient.post('/offer-letters/templates', {
        ...data,
        body_html: DOMPurify.sanitize(data.body_html),
      });
      return res.data.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['offer-letter-templates'] });
      setSelectedTemplateId(created.id);
      setIsDirty(false);
      success('Template created successfully');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create template');
    },
  });

  // Update Template Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await axiosClient.put(`/offer-letters/templates/${id}`, {
        ...data,
        body_html: DOMPurify.sanitize(data.body_html),
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letter-templates'] });
      setIsDirty(false);
      success('Offer letter template saved successfully');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update template');
    },
  });

  // Duplicate Template Mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosClient.post(`/offer-letters/templates/${id}/duplicate`);
      return res.data.data;
    },
    onSuccess: (duplicated) => {
      queryClient.invalidateQueries({ queryKey: ['offer-letter-templates'] });
      setSelectedTemplateId(duplicated.id);
      setFormData({
        name: duplicated.name,
        subject: duplicated.subject,
        body_html: duplicated.body_html,
        is_default: false,
      });
      setIsDirty(false);
      success('Template duplicated successfully');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to duplicate template');
    },
  });

  // Set Default Mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosClient.post(`/offer-letters/templates/${id}/default`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letter-templates'] });
      success('Template marked as default');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to set default template');
    },
  });

  // Delete Template Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/offer-letters/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letter-templates'] });
      setDeleteId(null);
      setSelectedTemplateId(null);
      success('Template deleted successfully');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete template');
    },
  });

  // Text formatting insertion helpers
  const insertTextAtCursor = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = prefix + selected + suffix;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setFormData((prev) => ({ ...prev, body_html: newValue }));
    setIsDirty(true);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const insertVariable = (variable: string) => {
    insertTextAtCursor(variable);
    setShowVariableDropdown(false);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      error('Template name is required');
      return;
    }
    if (!formData.subject.trim()) {
      error('Email subject line is required');
      return;
    }
    if (!formData.body_html.trim()) {
      error('Template body HTML content is required');
      return;
    }

    if (selectedTemplateId) {
      updateMutation.mutate({ id: selectedTemplateId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleNewTemplate = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard and create new?')) {
      return;
    }
    setSelectedTemplateId(null);
    setFormData({
      name: 'New Custom Offer Letter',
      subject: 'Offer of Employment: {{designation}} at {{company_name}}',
      body_html: `<p>Dear <strong>{{employee_name}}</strong>,</p>\n<p>We are delighted to extend an offer for the role of <strong>{{designation}}</strong>.</p>\n{{salary_breakup_table}}\n<p>Sincerely,<br/><strong>{{signatory_name}}</strong></p>`,
      is_default: false,
    });
    setIsDirty(true);
  };

  // Sample data substitution for live preview
  const getSampleRenderedHtml = () => {
    let html = formData.body_html || '';
    const sampleMap: Record<string, string> = {
      '{{company_name}}': 'Qynova Technologies Pvt Ltd',
      '{{company_address}}': 'Tower B, Tech Park, Chennai, Tamil Nadu - 600032',
      '{{letter_date}}': new Date().toLocaleDateString('en-GB'),
      '{{reference_no}}': 'OFR-2026-0042',
      '{{employee_name}}': 'Jane Candidate',
      '{{employee_address}}': '124 Park Avenue, Chennai, TN',
      '{{designation}}': 'Senior Full Stack Engineer',
      '{{department}}': 'Engineering',
      '{{joining_date}}': '01/11/2026',
      '{{employment_type}}': 'FULL TIME',
      '{{monthly_gross}}': '₹1,00,000.00',
      '{{annual_ctc}}': '₹12,00,000.00',
      '{{probation_months}}': '3',
      '{{reporting_manager}}': 'Alex Director',
      '{{work_location}}': 'Chennai Headquarters',
      '{{working_hours}}': '9:30 AM - 6:30 PM (Mon-Fri)',
      '{{notice_period_days}}': '30',
      '{{offer_valid_until}}': '08/11/2026',
      '{{signatory_name}}': 'Prakash Signatory',
      '{{signatory_designation}}': 'Head of People Operations',
      '{{salary_breakup_table}}': `<table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Salary Component</th>
      <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">Monthly (INR)</th>
      <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">Annual (INR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Basic Salary (50%)</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">₹50,000.00</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">₹6,00,000.00</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">House Rent Allowance (HRA)</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">₹20,000.00</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">₹2,40,000.00</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Special Allowance</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">₹30,000.00</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">₹3,60,000.00</td>
    </tr>
    <tr style="font-weight: bold; background-color: #f8fafc;">
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Total Cost to Company (CTC)</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">₹1,00,000.00</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">₹12,00,000.00</td>
    </tr>
  </tbody>
</table>`,
    };

    for (const [key, val] of Object.entries(sampleMap)) {
      html = html.split(key).join(val);
    }

    return DOMPurify.sanitize(html);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Offer Letter Templates & Variables
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Customize standardized offer letters, legal appointment clauses, and dynamic token replacements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              Unsaved Changes
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={handleNewTemplate}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Template
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Column: Template List */}
        <div className="lg:col-span-4 border-r border-slate-100 p-4 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Templates ({templates.length})
            </span>
          </div>

          <div className="space-y-1.5">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex items-start justify-between gap-3 ${
                  selectedTemplateId === t.id
                    ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/10'
                    : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {t.name}
                    </span>
                    {t.is_default && (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{t.subject}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => duplicateMutation.mutate(t.id)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                    title="Duplicate template"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!t.is_default && (
                    <button
                      onClick={() => setDeleteId(t.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Editor & Live Preview */}
        <div className="lg:col-span-8 p-6 space-y-5">
          {/* Editor Header & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveViewMode('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeViewMode === 'editor'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 inline mr-1" />
                HTML Source & Tokens
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeViewMode === 'preview'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                Live Preview
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedTemplate && !selectedTemplate.is_default && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDefaultMutation.mutate(selectedTemplate.id)}
                  isLoading={setDefaultMutation.isPending}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Set as Default
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Template Title" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="e.g. Standard Professional Offer"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Email Subject Line" required>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="Offer of Employment: {{designation}} at {{company_name}}"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>
          </div>

          {activeViewMode === 'editor' ? (
            <div className="space-y-2">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('<strong>', '</strong>')}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('<em>', '</em>')}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('<h3>', '</h3>')}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition"
                    title="Heading"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('<ul>\n  <li>', '</li>\n</ul>')}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition"
                    title="List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable('{{salary_breakup_table}}')}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition flex items-center gap-1"
                    title="Insert CTC Table"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    Salary Table
                  </button>
                </div>

                {/* Variable Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowVariableDropdown(!showVariableDropdown)}
                    className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Insert Variable
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showVariableDropdown && (
                    <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                      {TEMPLATE_VARIABLES.map((v) => (
                        <button
                          key={v.value}
                          type="button"
                          onClick={() => insertVariable(v.value)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-800">{v.label}</span>
                          <span className="font-mono text-[10px] text-slate-400">{v.value}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Textarea Editor */}
              <textarea
                ref={textareaRef}
                value={formData.body_html}
                onChange={(e) => {
                  setFormData({ ...formData, body_html: e.target.value });
                  setIsDirty(true);
                }}
                rows={16}
                className="w-full px-4 py-3 font-mono text-xs leading-relaxed bg-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 border border-slate-800"
                placeholder="Enter HTML template with {{double_brace}} variables..."
              />
            </div>
          ) : (
            /* Live Preview Container */
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl min-h-[420px] space-y-4">
              <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Subject: {formData.subject.replace('{{designation}}', 'Senior Full Stack Engineer').replace('{{company_name}}', 'Qynova Technologies')}
                  </h3>
                  <p className="text-xs text-slate-500">Live preview simulated with sample employee parameters.</p>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  Sample Preview
                </span>
              </div>

              <div
                className="prose prose-sm max-w-none text-slate-800 leading-relaxed space-y-3 font-sans"
                dangerouslySetInnerHTML={{ __html: getSampleRenderedHtml() }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        title="Delete Offer Letter Template"
        message="Are you sure you want to delete this template? Any previous offer letters created with this template will preserve their snapshot copy."
        variant="danger"
      />
    </div>
  );
};
