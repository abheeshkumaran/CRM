import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

interface CustomField {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  options?: string[];
  isRequired: boolean;
  showInList: boolean;
  showInForm: boolean;
  placeholder?: string;
  defaultValue?: string;
}

interface CustomFieldDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: string;
  editingField?: CustomField;
}

interface CustomFieldFormData {
  name: string;
  label: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
  showInList: boolean;
  showInForm: boolean;
  placeholder: string;
  defaultValue: string;
}

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'boolean', label: 'Checkbox' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' }
];

export default function CustomFieldDialog({ open, onClose, entityType, editingField }: CustomFieldDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CustomFieldFormData>({
    name: '',
    label: '',
    fieldType: 'text',
    options: [''],
    isRequired: false,
    showInList: false,
    showInForm: true,
    placeholder: '',
    defaultValue: ''
  });

  // Reset form when dialog opens or editingField changes
  React.useEffect(() => {
    if (open) {
      if (editingField) {
        setFormData({
          name: editingField.name,
          label: editingField.label,
          fieldType: editingField.fieldType,
          options: editingField.options && editingField.options.length > 0 ? editingField.options : [''],
          isRequired: editingField.isRequired,
          showInList: editingField.showInList,
          showInForm: editingField.showInForm,
          placeholder: editingField.placeholder || '',
          defaultValue: editingField.defaultValue || ''
        });
      } else {
        setFormData({
          name: '',
          label: '',
          fieldType: 'text',
          options: [''],
          isRequired: false,
          showInList: false,
          showInForm: true,
          placeholder: '',
          defaultValue: ''
        });
      }
    }
  }, [open, editingField])

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CustomFieldFormData> & { entityType: string }) => {
      const response = await api.post('/custom-fields', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CustomFieldFormData>) => {
      const response = await api.put(`/custom-fields/${editingField?.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      onClose();
    }
  });

  const handleLabelChange = (label: string) => {
    setFormData(prev => ({
      ...prev,
      label,
      // Auto-generate field name from label if not editing
      name: editingField ? prev.name : label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    }));
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      label: formData.label,
      fieldType: formData.fieldType,
      isRequired: formData.isRequired,
      showInList: formData.showInList,
      showInForm: formData.showInForm,
      placeholder: formData.placeholder,
      defaultValue: formData.defaultValue
    };

    // Add options for select/multiselect
    if (formData.fieldType === 'select' || formData.fieldType === 'multiselect') {
      data.options = formData.options.filter(opt => opt.trim() !== '');
    }

    // Add name and entityType only for create
    if (!editingField) {
      data.name = formData.name;
      data.entityType = entityType;
    }

    if (editingField) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const needsOptions = formData.fieldType === 'select' || formData.fieldType === 'multiselect';

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Field Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Industry"
              required
            />
          </div>

          {/* Field Name (auto-generated, shown but disabled when editing) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="auto-generated"
              disabled={!!editingField}
            />
            <p className="text-xs text-gray-500 mt-1">
              Internal name used in the database (auto-generated from label)
            </p>
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.fieldType}
              onChange={(e) => setFormData(prev => ({ ...prev, fieldType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!!editingField}
            >
              {fieldTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {editingField && (
              <p className="text-xs text-gray-500 mt-1">
                Field type cannot be changed after creation
              </p>
            )}
          </div>

          {/* Options (for select/multiselect) */}
          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${index + 1}`}
                    />
                    {formData.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </button>
              </div>
            </div>
          )}

          {/* Placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder Text
            </label>
            <input
              type="text"
              value={formData.placeholder}
              onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Select an industry..."
            />
          </div>

          {/* Default Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Value
            </label>
            <input
              type="text"
              value={formData.defaultValue}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional default value"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Required Field</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.showInList}
                onChange={(e) => setFormData(prev => ({ ...prev, showInList: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show in List View</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.showInForm}
                onChange={(e) => setFormData(prev => ({ ...prev, showInForm: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show in Form</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingField ? 'Update Field' : 'Create Field'
              }
            </button>
          </div>

          {/* Error Messages */}
          {(createMutation.isError || updateMutation.isError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {(createMutation.error as any)?.response?.data?.message ||
                  (updateMutation.error as any)?.response?.data?.message ||
                  'An error occurred'}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
