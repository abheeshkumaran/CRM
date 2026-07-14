import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
}

interface Template {
  name: string;
  status: string;
  category: string;
  language: string;
  components: TemplateComponent[];
}

interface TemplatePickerProps {
  onSelect: (template: Template, variables: Record<string, string>) => void;
  onClose: () => void;
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({ onSelect, onClose }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/whatsapp/templates');
        // Meta API returns templates in data array or directly
        const templateData = Array.isArray(response.data) ? response.data : [];
        setTemplates(templateData.filter((t: Template) => t.status === 'APPROVED'));
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const extractVariables = (template: Template) => {
    const vars: string[] = [];
    template.components.forEach(comp => {
      if (comp.text) {
        const matches = comp.text.match(/\{\{\d+\}\}/g);
        if (matches) {
          matches.forEach(m => {
            const num = m.replace(/\{\{|\}\}/g, '');
            if (!vars.includes(num)) vars.push(num);
          });
        }
      }
    });
    return vars.sort((a, b) => parseInt(a) - parseInt(b));
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    const vars = extractVariables(template);
    const initialVars: Record<string, string> = {};
    vars.forEach(v => initialVars[v] = '');
    setVariables(initialVars);
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">WhatsApp Templates</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Template List */}
          <div className="w-full md:w-1/2 border-r border-border flex flex-col">
            <div className="p-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search templates..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No templates found</div>
              ) : (
                filteredTemplates.map(t => (
                  <div
                    key={t.name}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${selectedTemplate?.name === t.name ? 'bg-primary/10 border-primary border' : 'hover:bg-muted border border-transparent'}`}
                    onClick={() => handleTemplateSelect(t)}
                  >
                    <p className="font-medium text-sm text-foreground truncate">{t.name.replace(/_/g, ' ')}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">{t.category}</span>
                      <span className="text-[10px] text-muted-foreground">{t.language}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Template Details & Variable Input */}
          <div className="w-full md:w-1/2 bg-muted/30 flex flex-col">
            {selectedTemplate ? (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <h3 className="text-sm font-semibold mb-3 text-foreground">Preview & Variables</h3>

                <div className="bg-card p-3 rounded shadow-sm border border-border mb-4 whitespace-pre-wrap text-sm text-foreground">
                  {selectedTemplate.components.find(c => c.type === 'BODY')?.text?.replace(/\{\{(\d+)\}\}/g, (match, p1) => {
                    return variables[p1] ? `[${variables[p1]}]` : match;
                  })}
                </div>

                {Object.keys(variables).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Fill in variables:</p>
                    {Object.keys(variables).map(v => (
                      <div key={v}>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Variable {v}</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                          placeholder={`Enter value for {{${v}}}`}
                          value={variables[v]}
                          onChange={(e) => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8 text-center">
                Select a template from the list to preview and configure variables.
              </div>
            )}

            <div className="p-4 border-t border-border bg-card flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedTemplate}
                onClick={() => selectedTemplate && onSelect(selectedTemplate, variables)}
                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${selectedTemplate ? 'bg-primary hover:bg-primary/90 shadow-md' : 'bg-primary/50 cursor-not-allowed'}`}
              >
                Send Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePicker;
