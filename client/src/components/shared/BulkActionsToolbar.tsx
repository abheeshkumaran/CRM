import { Button } from '@/components/ui/button';
import { isAdmin, getUserInfo } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    ChevronDown,
    Mail,
    UserPlus,
    Trash2,
    Download,
    Tag,
    MessageSquare,
    Phone,
    Calendar,
    Archive
} from 'lucide-react';

interface BulkActionsToolbarProps {
    selectedItems: string[];
    entityType: 'leads' | 'contacts' | 'accounts' | 'opportunities';
    onClearSelection: () => void;
    onBulkAction: (action: string, data?: Record<string, unknown>) => void | Promise<void>;
    className?: string;
}

export function BulkActionsToolbar({
    selectedItems,
    entityType,
    onClearSelection,
    onBulkAction,
    className = ''
}: BulkActionsToolbarProps) {
    if (selectedItems.length === 0) return null;

    const user = getUserInfo();
    const adminUser = isAdmin(user);

    const getEntityActions = () => {
        const commonActions = [
            {
                label: 'Export Selected',
                icon: Download,
                action: 'export',
            },
            {
                label: 'Add Tags',
                icon: Tag,
                action: 'add-tags',
            }
        ];

        const entitySpecificActions: Record<string, { label: string; icon: typeof Tag; action: string }[]> = {
            leads: [
                { label: 'Update Status', icon: Tag, action: 'update-status' },
                { label: 'Assign to User', icon: UserPlus, action: 'assign' },
                { label: 'Send Email', icon: Mail, action: 'send-email' },
                { label: 'Send WhatsApp', icon: MessageSquare, action: 'send-whatsapp' },
                { label: 'Schedule Follow-up', icon: Calendar, action: 'schedule-followup' },
                { label: 'Convert to Contacts', icon: UserPlus, action: 'convert' },
            ],
            contacts: [
                { label: 'Send Email', icon: Mail, action: 'send-email' },
                { label: 'Send WhatsApp', icon: MessageSquare, action: 'send-whatsapp' },
                { label: 'Schedule Call', icon: Phone, action: 'schedule-call' },
                { label: 'Add to Campaign', icon: Mail, action: 'add-to-campaign' },
            ],
            accounts: [
                { label: 'Assign Owner', icon: UserPlus, action: 'assign-owner' },
                { label: 'Update Status', icon: Tag, action: 'update-status' },
                { label: 'Archive', icon: Archive, action: 'archive' },
            ],
            opportunities: [
                { label: 'Update Stage', icon: Tag, action: 'update-stage' },
                { label: 'Assign Owner', icon: UserPlus, action: 'assign-owner' },
                { label: 'Generate Quotes', icon: Download, action: 'generate-quotes' },
            ],

        };

        return [...(entitySpecificActions[entityType] || []), ...commonActions];
    };

    const actions = getEntityActions();

    return (
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between bg-primary/5 border border-primary/10 rounded-lg p-3 gap-3 mb-4 ${className}`}>
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                <div className="text-sm font-medium text-primary whitespace-nowrap">
                    {selectedItems.length} {entityType} selected
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="text-primary/70 hover:text-primary hover:bg-primary/10 h-8 px-2 text-xs"
                >
                    Clear selection
                </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-primary hover:bg-primary/90 w-full sm:w-auto h-9"
                        >
                            Bulk Actions
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {actions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <DropdownMenuItem
                                    key={action.action}
                                    onSelect={() => {
                                        onBulkAction(action.action);
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <Icon className="h-4 w-4" />
                                    {action.label}
                                </DropdownMenuItem>
                            );
                        })}
                        {adminUser && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => {
                                        onBulkAction('delete');
                                    }}
                                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Selected
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}