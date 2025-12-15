import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Plus, Edit, Trash2, Loader2, Languages } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api-client.ts';
import Modal from '../components/Modal.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';

interface Template {
  template_id: string;
  template_name: string;
  template_type: string;
  subject_line?: string;
  message_body: string;
  default_channel?: string;
  is_default: boolean;
  user_id?: string;
}

// Helper function to split bilingual content
const splitBilingualContent = (content: string) => {
  // Split by "---" separator (common pattern for bilingual content)
  const parts = content.split(/\n*---+\n*/);
  if (parts.length >= 2) {
    return {
      english: parts[0].trim(),
      chinese: parts[1].trim()
    };
  }
  // If no separator, return the whole content as English
  return {
    english: content.trim(),
    chinese: ''
  };
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  
  // Form data - using separate fields for English and Chinese
  const [formData, setFormData] = useState({
    template_name: '',
    template_type: 'Custom',
    subject_line: '',
    english_text: '',
    chinese_text: '',
    default_channel: 'Email'
  });

  // Group templates by category
  const groupedTemplates = React.useMemo(() => {
    const scanTemplates = templates.filter(t => t.template_name.startsWith('Scan:'));
    const standardTemplates = templates.filter(t => 
      t.is_default && !t.template_name.startsWith('Scan:')
    );
    const customTemplates = templates.filter(t => 
      !t.is_default && !t.template_name.startsWith('Scan:')
    );

    return {
      scan: scanTemplates,
      standard: standardTemplates,
      custom: customTemplates
    };
  }, [templates]);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await api.templates.getAll();
      const templateList = response.templates || [];
      setTemplates(templateList);
      if (templateList.length > 0 && !selectedTemplate) {
        setSelectedTemplate(templateList[0]);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      template_type: 'Custom',
      subject_line: '',
      english_text: '',
      chinese_text: '',
      default_channel: 'Email'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    
    // Split the message_body into English and Chinese
    const { english, chinese } = splitBilingualContent(template.message_body);
    
    setFormData({
      template_name: template.template_name || '',
      template_type: template.template_type || 'Custom',
      subject_line: template.subject_line || '',
      english_text: english,
      chinese_text: chinese,
      default_channel: template.default_channel || 'Email'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      template_type: 'Custom',
      subject_line: '',
      english_text: '',
      chinese_text: '',
      default_channel: 'Email'
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTranslate = async () => {
    // Validate English text exists
    if (!formData.english_text.trim()) {
      toast.error('Please enter English text first');
      return;
    }

    setTranslating(true);

    try {
      const response = await api.translation.translateText(formData.english_text);
      
      if (response.success && response.translatedText) {
        // Update Chinese text field with translation
        setFormData(prev => ({ ...prev, chinese_text: response.translatedText }));
        toast.success('Translation completed successfully!');
      } else {
        toast.error('Translation failed. Please try again.');
      }
    } catch (err) {
      console.error('Translation error:', err);
      const errorMessage = (err as Error).message || 'Translation failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.template_name || !formData.english_text) {
      toast.error('Template name and English text are required');
      return;
    }

    setSaving(true);

    try {
      // Combine English and Chinese text into message_body
      let message_body = formData.english_text;
      if (formData.chinese_text.trim()) {
        message_body = `${formData.english_text}\n\n---\n\n${formData.chinese_text}`;
      }

      const payload = {
        template_name: formData.template_name,
        template_type: formData.template_type,
        subject_line: formData.subject_line,
        message_body: message_body,
        default_channel: formData.default_channel
      };

      if (editingTemplate) {
        await api.templates.update(editingTemplate.template_id, payload);
        toast.success('Template updated successfully!');
      } else {
        await api.templates.create(payload);
        toast.success('Template created successfully!');
      }
      closeModal();
      loadTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
      toast.error(`Failed to ${editingTemplate ? 'update' : 'create'} template`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: Template) => {
    if (template.is_default) {
      toast.error('Cannot delete default templates');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${template.template_name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingTemplateId(template.template_id);

    try {
      await api.templates.delete(template.template_id);
      toast.success('Template deleted successfully!');
      if (selectedTemplate?.template_id === template.template_id) {
        setSelectedTemplate(templates[0] || null);
      }
      loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast.error('Failed to delete template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const handleCopy = (text: string, lang: string) => {
    navigator.clipboard.writeText(text);
    if (lang === 'en') {
      toast.success('English template copied!');
    } else if (lang === 'cn') {
      toast.success('Chinese template copied!');
    } else {
      toast.success('Combined template copied!');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner 
            message="Loading templates..." 
            size="lg"
          />
        </div>
        <div className="animate-pulse space-y-6 opacity-50 mt-8">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Get English and Chinese versions for display
  const getTemplateVersions = (template: Template) => {
    const { english, chinese } = splitBilingualContent(template.message_body);
    return { english, chinese };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Email Templates</h1>
          <p className="text-sm md:text-base text-gray-600">Manage and use bilingual message templates</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 md:p-12 text-center">
          <div className="text-5xl md:text-6xl mb-4">📝</div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No templates yet</h3>
          <p className="text-sm md:text-base text-gray-600 mb-6">Create your first notification template to get started</p>
          <button
            onClick={openCreateModal}
            className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            + Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Left Sidebar - Template List */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-3 md:p-4 border-b border-gray-200">
                <h3 className="text-sm md:text-base font-semibold text-gray-900">Email Templates</h3>
              </div>
              <div className="p-2 max-h-[50vh] lg:max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* Scan Templates Section */}
                  {groupedTemplates.scan.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        📱 Scan Templates
                      </div>
                      <div className="space-y-1">
                        {groupedTemplates.scan.map((template) => (
                          <div key={template.template_id} className="relative group">
                            <button
                              onClick={() => setSelectedTemplate(template)}
                              className={`w-full text-left p-3 pr-10 rounded-lg transition-colors text-sm ${
                                selectedTemplate?.template_id === template.template_id
                                  ? 'bg-blue-50 text-blue-900 font-medium border border-blue-200'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className="block truncate">{template.template_name.replace('Scan: ', '')}</span>
                            </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(template)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded bg-white shadow-sm border border-blue-200"
                                title="Edit template"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standard Templates Section */}
                  {groupedTemplates.standard.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        🔔 Standard Templates
                      </div>
                      <div className="space-y-1">
                        {groupedTemplates.standard.map((template) => (
                          <div key={template.template_id} className="relative group">
                            <button
                              onClick={() => setSelectedTemplate(template)}
                              className={`w-full text-left p-3 pr-10 rounded-lg transition-colors text-sm ${
                                selectedTemplate?.template_id === template.template_id
                                  ? 'bg-gray-100 text-gray-900 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className="block truncate">{template.template_name}</span>
                            </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(template)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded bg-white shadow-sm border border-blue-200"
                                title="Edit template"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Templates Section */}
                  {groupedTemplates.custom.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        ✨ Custom Templates
                      </div>
                      <div className="space-y-1">
                        {groupedTemplates.custom.map((template) => (
                          <div key={template.template_id} className="relative group">
                            <button
                              onClick={() => setSelectedTemplate(template)}
                              className={`w-full text-left p-3 pr-16 rounded-lg transition-colors text-sm ${
                                selectedTemplate?.template_id === template.template_id
                                  ? 'bg-gray-100 text-gray-900 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className="truncate block">{template.template_name}</span>
                            </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => openEditModal(template)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded bg-white shadow-sm border border-blue-200"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(template)}
                                disabled={deletingTemplateId === template.template_id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded bg-white shadow-sm border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                {deletingTemplateId === template.template_id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State for Custom Templates */}
                  {groupedTemplates.custom.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-400 italic">
                      No custom templates yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Template Display */}
          {selectedTemplate && (
            <div className="lg:col-span-3 space-y-4 md:space-y-6">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 break-words">{selectedTemplate.template_name}</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => openEditModal(selectedTemplate)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm md:text-base"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(selectedTemplate)}
                    disabled={deletingTemplateId === selectedTemplate.template_id || selectedTemplate.is_default}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    title={selectedTemplate.is_default ? "Cannot delete default templates" : "Delete"}
                  >
                    {deletingTemplateId === selectedTemplate.template_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>{deletingTemplateId === selectedTemplate.template_id ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>
              </div>

              {/* Three Column Template Display - Stack on mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* English Version */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-3 md:p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900">English Version</h3>
                    <button
                      onClick={() => handleCopy(getTemplateVersions(selectedTemplate).english, 'en')}
                      className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Copy className="w-3 h-3 md:w-4 md:h-4" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-3 md:p-4">
                    <div className="h-[300px] md:h-[500px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words text-xs md:text-sm text-gray-700 font-sans">
                        {getTemplateVersions(selectedTemplate).english}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Chinese Version */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-3 md:p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900">Chinese Version</h3>
                    <button
                      onClick={() => handleCopy(getTemplateVersions(selectedTemplate).chinese, 'cn')}
                      className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      disabled={!getTemplateVersions(selectedTemplate).chinese}
                    >
                      <Copy className="w-3 h-3 md:w-4 md:h-4" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-3 md:p-4">
                    <div className="h-[300px] md:h-[500px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words text-xs md:text-sm text-gray-700 font-sans">
                        {getTemplateVersions(selectedTemplate).chinese || '(No Chinese translation)'}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Combined Version */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-3 md:p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900">Combined Version</h3>
                    <button
                      onClick={() => handleCopy(selectedTemplate.message_body, 'combined')}
                      className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Copy className="w-3 h-3 md:w-4 md:h-4" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-3 md:p-4">
                    <div className="h-[300px] md:h-[500px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words text-xs md:text-sm text-gray-700 font-sans">
                        {selectedTemplate.message_body}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Placeholders Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="space-y-3">
                  <p className="font-semibold text-gray-900">Available placeholders:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{'{Name}'}</span>
                      <span>- Customer name</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{'{BoxNumber}'}</span>
                      <span>- Mailbox number</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{'{Type}'}</span>
                      <span>- Mail type (letter/package)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{'{Date}'}</span>
                      <span>- Date</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Template Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal}
        title={editingTemplate ? 'Edit Template' : 'Create New Template'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Default Template Warning */}
          {editingTemplate?.is_default && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ℹ️ You're editing a <strong>default template</strong>. Changes will affect all users using this template.
              </p>
            </div>
          )}

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Template Name *</label>
            <input
              type="text"
              name="template_name"
              value={formData.template_name}
              onChange={handleChange}
              required
              placeholder="e.g., New Mail Notification"
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Template Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Template Type *</label>
            <select
              name="template_type"
              value={formData.template_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Initial">Initial Notification</option>
              <option value="Reminder">Reminder</option>
              <option value="Confirmation">Confirmation</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Subject Line</label>
            <input
              type="text"
              name="subject_line"
              value={formData.subject_line}
              onChange={handleChange}
              placeholder="Email subject (optional)"
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* English Text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-900">English Text *</label>
              <button
                type="button"
                onClick={handleTranslate}
                disabled={!formData.english_text.trim() || translating}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Translate to Chinese using Amazon Translate"
              >
                {translating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Translating...</span>
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4" />
                    <span>Translate to Chinese</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              name="english_text"
              value={formData.english_text}
              onChange={handleChange}
              required
              rows={8}
              placeholder="Enter the English version of the template..."
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
            />
          </div>

          {/* Chinese Text */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Chinese Text</label>
            <textarea
              name="chinese_text"
              value={formData.chinese_text}
              onChange={handleChange}
              rows={8}
              placeholder="输入模板的中文版本..."
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
            />
            <p className="mt-2 text-sm text-gray-600">
              English and Chinese will be combined with "---" separator
            </p>
          </div>

          {/* Default Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Default Channel</label>
            <select
              name="default_channel"
              value={formData.default_channel}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Email">Email</option>
              <option value="SMS">SMS</option>
              <option value="Both">Both</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
