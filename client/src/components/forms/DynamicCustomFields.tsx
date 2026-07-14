import { useQuery } from '@tanstack/react-query';
import { getCustomFields } from '../../services/settingsService';

interface DynamicCustomFieldsProps {
  entityType: string;
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  errors?: Record<string, string>;
}

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
  isActive: boolean;
}

export default function DynamicCustomFields({ entityType, values, onChange, errors = {} }: DynamicCustomFieldsProps) {
  const { data: customFields = [], isLoading } = useQuery({
    queryKey: ['customFields', entityType],
    queryFn: () => getCustomFields(entityType)
  });

  const activeFields = customFields.filter((field: CustomField) => field.isActive && field.showInForm);

  if (isLoading) {
    return (
      <div className="py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (activeFields.length === 0) {
    return null;
  }

  const renderField = (field: CustomField) => {
    const value = values[field.name] || field.defaultValue || '';
    const error = errors[field.name];

    const commonClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'
      }`;

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <input
            type={field.fieldType === 'email' ? 'email' : field.fieldType === 'url' ? 'url' : 'text'}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={commonClasses}
            required={field.isRequired}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={commonClasses}
            rows={3}
            required={field.isRequired}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={commonClasses}
            required={field.isRequired}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={commonClasses}
            required={field.isRequired}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={commonClasses}
            required={field.isRequired}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              onChange(field.name, selected);
            }}
            className={`${commonClasses} min-h-[100px]`}
            required={field.isRequired}
          >
            {field.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(field.name, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">{field.placeholder || 'Yes'}</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={commonClasses}
            required={field.isRequired}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Custom Fields</h3>
        <div className="space-y-4">
          {activeFields.map((field: CustomField) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
