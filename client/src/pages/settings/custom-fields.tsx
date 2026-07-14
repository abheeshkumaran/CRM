import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { getCustomFields } from '../../services/settingsService';
import { api } from '../../services/api';
import CustomFieldDialog from '../../components/settings/CustomFieldDialog';

interface CustomField {
  id: string;
  name: string;
  label: string;
  entityType: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
  isActive: boolean;
  showInList: boolean;
  showInForm: boolean;
  order: number;
  placeholder?: string;
  defaultValue?: string;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

export default function CustomFieldsSettings() {
  const [selectedEntity, setSelectedEntity] = useState<string>('Lead');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const queryClient = useQueryClient();

  const entityTypes = ['Lead', 'Contact', 'Account', 'Opportunity'];

  const { data: customFields = [], isLoading } = useQuery({
    queryKey: ['customFields', selectedEntity],
    queryFn: () => getCustomFields(selectedEntity)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.put(`/custom-fields/${id}`, { isActive: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    }
  });

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, label: string) => {
    if (window.confirm(`Are you sure you want to delete the field "${label}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingField(null);
  };

  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Text',
      textarea: 'Text Area',
      number: 'Number',
      date: 'Date',
      select: 'Dropdown',
      multiselect: 'Multi-Select',
      boolean: 'Checkbox',
      email: 'Email',
      phone: 'Phone',
      url: 'URL'
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
        <p className="text-gray-600 mt-1">
          Add custom fields to capture additional information specific to your business needs
        </p>
      </div>

      {/* Entity Type Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {entityTypes.map((entity) => (
            <button
              key={entity}
              onClick={() => setSelectedEntity(entity)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${selectedEntity === entity
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {entity}s
            </button>
          ))}
        </nav>
      </div>

      {/* Add Field Button */}
      <div className="mb-6">
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Field
        </button>
      </div>

      {/* Custom Fields List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : customFields.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No custom fields defined for {selectedEntity}s yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Custom Field" to create one</p>
        </div>
      ) : (
        <div className="space-y-4">
          {customFields.map((field: CustomField) => (
            <div
              key={field.id}
              className={`
                bg-white border rounded-lg p-4 
                ${!field.isActive ? 'opacity-60 bg-gray-50' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {field.label}
                    </h3>
                    {field.isRequired && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Required
                      </span>
                    )}
                    {!field.isActive && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Field Name: <code className="bg-gray-100 px-1 rounded">{field.name}</code>
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>Type: {getFieldTypeLabel(field.fieldType)}</span>
                    {field.showInList && <span>• Shown in List</span>}
                    {field.showInForm && <span>• Shown in Form</span>}
                  </div>
                  {field.options && field.options.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Options: </span>
                      <span className="text-sm text-gray-800">
                        {field.options.join(', ')}
                      </span>
                    </div>
                  )}
                  {field.placeholder && (
                    <p className="text-sm text-gray-500 mt-1">
                      Placeholder: "{field.placeholder}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(field.id, field.isActive)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title={field.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {field.isActive ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(field)}
                    className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(field.id, field.label)}
                    className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Field Dialog */}
      <CustomFieldDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        entityType={selectedEntity}
        editingField={editingField || undefined}
      />
    </div>
  );
}
