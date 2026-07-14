import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { format } from 'date-fns';
import {
  Activity,
  PhoneCall,
  Mail,
  Calendar,
  CheckSquare,
  Shield,
  Clock,
  MessageCircle,
  FileText,
  Download,
  Trash2,
  Pencil
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CallRecordingPlayer } from '@/components/CallRecordingPlayer';
import { getBestDurationSeconds, formatDuration } from '@/lib/callUtils';
import { isOrgAdmin, getUserInfo } from '@/lib/utils';
import { toast } from 'sonner';
import { EditDocumentDialog } from '@/components/EditDocumentDialog';

interface TimelineItem {
  id: string;
  type: 'interaction' | 'task' | 'event' | 'audit' | 'recording' | 'document' | 'followUp';
  subType: string;
  title: string;
  description?: string;
  date: string;
  actor?: {
    id?: string;
    firstName: string;
    lastName?: string;
  };
  meta?: {
    direction?: string;
    duration?: number;
    recordingDuration?: number;
    recordingUrl?: string;
    fileUrl?: string;
    fileSize?: number;
    fileType?: string;
    priority?: string;
    location?: string;
  };
}

interface TimelineFeedProps {
  type: 'lead' | 'contact' | 'account' | 'opportunity';
  id: string;
}

export default function TimelineFeed({ type, id }: TimelineFeedProps) {
  const { data: timeline, isLoading } = useQuery({
    queryKey: ['timeline', type, id],
    queryFn: async () => {
      const res = await api.get(`/timeline/${type}/${id}`);
      return res.data;
    }
  });

  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();
  const user = getUserInfo();
  const isAdmin = isOrgAdmin(user);

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', type, id] });
      toast.success("Document deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete document");
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
        <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
        No activity history found.
      </div>
    );
  }

  const getIcon = (item: { type: string, subType?: string }) => {
    switch (item.type) {
      case 'interaction':
        if (item.subType === 'call') return <PhoneCall className="h-4 w-4" />;
        if (item.subType === 'whatsapp') return <MessageCircle className="h-4 w-4" />;
        return <Mail className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'followUp':
        return <Clock className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      case 'audit':
        return <Shield className="h-4 w-4" />;
      case 'recording':
        return <PhoneCall className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getColor = (item: { type: string, subType?: string }) => {
    switch (item.type) {
      case 'interaction': 
        if (item.subType === 'whatsapp') return 'bg-green-500/10 text-green-600 dark:text-green-400 ring-green-500/20';
        return 'bg-primary/10 text-primary ring-primary/20';
      case 'task': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20';
      case 'followUp': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20';
      case 'event': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-500/20';
      case 'audit': return 'bg-muted text-muted-foreground ring-border';
      case 'recording': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20';
      case 'document': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20';
      default: return 'bg-muted text-muted-foreground ring-border';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-muted-foreground" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 border-l-2 border-border space-y-8">
          {timeline.filter((item: any) => !(item.type === 'interaction' && item.subType === 'whatsapp')).map((item: TimelineItem, index: number) => (
            <div key={`${item.type}-${item.id}-${index}`} className="relative">
              <div className={`absolute -left-[2.15rem] p-2 rounded-full ring-4 ring-background ${getColor(item)}`}>
                {getIcon(item)}
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {item.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    {item.description || 'No description'}
                  </p>

                  {/* Detailed Metadata rendering for Calls */}
                  {item.type === 'interaction' && item.subType === 'call' && (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        {item.meta?.direction && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider font-bold">
                            {item.meta?.direction}
                          </span>
                        )}
                        {getBestDurationSeconds(item.meta) > 0 && (
                          <span className="text-xs text-muted-foreground italic">
                            ({formatDuration(getBestDurationSeconds(item.meta))})
                          </span>
                        )}
                      </div>
                      {item.meta?.recordingUrl && item.meta.recordingUrl !== '' && (
                        <CallRecordingPlayer 
                          recordingUrl={item.meta.recordingUrl} 
                          duration={getBestDurationSeconds(item.meta)} 
                        />
                      )}
                    </div>
                  )}

                  {item.type === 'interaction' && item.subType !== 'call' && item.meta?.direction && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground mt-2 inline-block w-fit">
                      {item.meta?.direction}
                    </span>
                  )}

                  {item.type === 'recording' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold uppercase tracking-wider">
                          {item.subType}
                        </span>
                        {getBestDurationSeconds(item.meta) > 0 && (
                          <span className="text-xs text-muted-foreground italic">
                            ({formatDuration(getBestDurationSeconds(item.meta))})
                          </span>
                        )}
                      </div>
                      {item.meta?.fileUrl && (
                        <CallRecordingPlayer 
                          recordingUrl={item.meta.fileUrl} 
                          duration={getBestDurationSeconds(item.meta)} 
                        />
                      )}
                    </div>
                  )}

                  {item.type === 'document' && (
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-dashed flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded border">
                          <FileText className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium truncate max-w-[200px]">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.subType} • {( (item.meta?.fileSize || 0) / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={() => item.meta?.fileUrl && window.open(item.meta.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {(isAdmin || (item.actor as any)?.id === user?.id) && (
                        <>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingDoc({
                                id: item.id,
                                name: item.title,
                                description: item.description,
                                category: item.subType
                              });
                              setIsEditOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this document?")) {
                                deleteDocumentMutation.mutate(item.id);
                              }
                            }}
                            disabled={deleteDocumentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2 sm:mt-0 text-xs text-muted-foreground whitespace-nowrap text-right">
                  <div>{format(new Date(item.date), 'MMM d, h:mm a')}</div>
                  {item.actor && (
                    <div className="mt-0.5">by {item.actor.firstName}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      {editingDoc && (
        <EditDocumentDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          document={editingDoc}
        />
      )}
    </Card>
  );
}

function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
      <path d="M3 3v9h9" />
      <path d="M12 7v5l4 2" />
    </svg>
  )
}
