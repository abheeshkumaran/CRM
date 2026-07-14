import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { useSocket } from '../../contexts/useSocket';
import MediaPreview from './MediaPreview';
import TemplatePicker from './TemplatePicker';

interface Message {
  id: string;
  waMessageId?: string;
  direction: 'incoming' | 'outgoing';
  messageType: string;
  content: {
    text?: string,
    templateName?: string,
    language?: string,
    variables?: Record<string, string>,
    mediaId?: string,
    caption?: string,
    filename?: string,
    components?: { type: string, parameters: { type: string, text: string }[] }[]
  };
  status: string;
  createdAt: string;
  isReadByAgent?: boolean;
}

interface ChatWindowProps {
  phoneNumber: string;
  onBack?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ phoneNumber, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchMessages = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/whatsapp/messages', {
        params: { phoneNumber, limit: 100 }
      });
      // Reverse so oldest is top
      setMessages(response.data.reverse());
    } catch (error) {
      console.error('Failed to load messages', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [phoneNumber]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markAsRead = useCallback(async () => {
    try {
      await api.post('/whatsapp/messages/mark-conversation-read', { phoneNumber });
    } catch (error) {
      console.error('Failed to mark conversation as read', error);
    }
  }, [phoneNumber]);

  useEffect(() => {
    fetchMessages(true);
    markAsRead();

    // Polling as a fallback (longer interval)
    const interval = setInterval(() => fetchMessages(false), 60000);

    // Socket listeners
    if (socket) {
      const handleNewMessage = (data: { message: Message, phoneNumber: string }) => {
        if (data.phoneNumber === phoneNumber) {
          setMessages(prev => {
            // Check if message already exists (prevent duplicates from sending + listener)
            if (prev.find(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          // Auto-mark as read if we are looking at this chat
          markAsRead();
        }
      };

      const handleStatusUpdate = (data: { messageId: string, dbMessageId: string, status: string, phoneNumber: string }) => {
        if (data.phoneNumber === phoneNumber) {
          setMessages(prev => prev.map(m => {
            if (m.id === data.dbMessageId) {
              return { ...m, status: data.status };
            }
            return m;
          }));
        }
      };

      socket.on('whatsapp_message_received', handleNewMessage);
      socket.on('whatsapp_status_update', handleStatusUpdate);

      return () => {
        clearInterval(interval);
        socket.off('whatsapp_message_received', handleNewMessage);
        socket.off('whatsapp_status_update', handleStatusUpdate);
      };
    }

    return () => clearInterval(interval);
  }, [phoneNumber, socket, fetchMessages, markAsRead]);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      // Optimistic update
      const tempMessage: Message = {
        id: 'temp-' + Date.now(),
        direction: 'outgoing',
        messageType: 'text',
        content: { text: newMessage },
        status: 'sending',
        createdAt: new Date().toISOString(),
        isReadByAgent: true
      };
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      await api.post('/whatsapp/send', {
        to: phoneNumber,
        message: newMessage,
        type: 'text'
      });

      // Refresh to get real message status
      fetchMessages();
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // 1. Upload to WhatsApp/Meta
      const uploadRes = await api.post('/whatsapp/upload-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const mediaId = uploadRes.data.id;
      const mediaType = file.type.split('/')[0];
      const type = (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio')
        ? mediaType
        : 'document';

      // 2. Send Media Message
      await api.post('/whatsapp/send-media', {
        to: phoneNumber,
        mediaType: type,
        mediaId,
        filename: file.name,
        caption: ''
      });

      fetchMessages();
    } catch (error) {
      console.error('Failed to upload/send media', error);
    } finally {
      setSending(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleTemplateSelect = async (template: { name: string, language: string }, variables: Record<string, string>) => {
    try {
      setSending(true);
      setShowTemplatePicker(false);

      // Convert variables record to components array for backend
      const bodyParameters = Object.keys(variables).map(v => ({
        type: 'text',
        text: variables[v]
      }));

      const components: { type: string, parameters: { type: string, text: string }[] }[] = [];
      if (bodyParameters.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParameters
        });
      }

      // optimistic update
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        direction: 'outgoing',
        messageType: 'template',
        content: {
          templateName: template.name,
          language: template.language,
          variables
        },
        status: 'sending',
        createdAt: new Date().toISOString(),
        isReadByAgent: true
      };
      setMessages(prev => [...prev, tempMessage]);

      await api.post('/whatsapp/send', {
        to: phoneNumber,
        type: 'template',
        templateName: template.name,
        languageCode: template.language,
        components: components
      });

      fetchMessages();
    } catch (error) {
      console.error('Failed to send template', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-card p-3 px-4 border-b border-border flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{phoneNumber}</h3>
            <span className="text-xs text-muted-foreground block leading-tight">WhatsApp</span>
          </div>
        </div>
        <div className="hidden md:block">
          <button onClick={() => fetchMessages(true)} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 2.303A7 7 0 0010.63 2.31M4.68 5.68A7 7 0 002.31 10.63m4.385-4.385l-.01.01m0-1.667v1.667h1.667m10.133 10.133A7 7 0 0016.023 22.5m-5.393-22.5a7 7 0 01-5.393 2.222m5.393 15.185v-1.667h-1.667m1.667 1.667L10.63 21.69a7 7 0 005.393-2.222" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col bg-muted/20">
        {loading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <p className="bg-card px-4 py-2 rounded-full text-xs shadow-sm mb-4 uppercase font-bold tracking-widest border border-border">No messages yet</p>
            <p className="text-sm">Send a template or text to start chatting!</p>
          </div>
        ) : messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.direction === 'outgoing' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-sm relative transition-all hover:shadow-md ${msg.direction === 'outgoing' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card text-foreground border border-border rounded-tl-none'}`}>
              {/* Message Content */}
              <div className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                {msg.messageType === 'text' && msg.content?.text}

                {msg.messageType === 'template' && (
                  <div className="space-y-1">
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${msg.direction === 'outgoing' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4.13-5.69z" clipRule="evenodd" />
                      </svg>
                      Template: {msg.content?.templateName?.replace(/_/g, ' ')}
                    </div>
                    {/* Since we don't store the full body of the template, we show the template name and some variables if available */}
                    {msg.content?.components?.[0]?.parameters ? (
                      <div className="mt-2 space-y-2">
                        <p className={`text-[10px] font-bold uppercase tracking-tight ${msg.direction === 'outgoing' ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>Variables:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.content.components[0].parameters.map((p: { text: string }, i: number) => (
                            <span key={i} className={`px-2 py-0.5 text-[10px] rounded border font-medium ${msg.direction === 'outgoing' ? 'bg-white/10 text-white border-white/20' : 'bg-muted text-foreground border-border'}`}>
                              {p.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className={`italic text-xs ${msg.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>Approved template message sent.</p>
                    )}
                  </div>
                )}

                {msg.messageType === 'image' && (
                  <MediaPreview
                    mediaId={msg.content?.mediaId || ''}
                    type="image"
                    caption={msg.content?.caption || ''}
                  />
                )}
                {msg.messageType === 'video' && (
                  <MediaPreview
                    mediaId={msg.content?.mediaId || ''}
                    type="video"
                    caption={msg.content?.caption || ''}
                  />
                )}
                {msg.messageType === 'audio' && (
                  <MediaPreview
                    mediaId={msg.content?.mediaId || ''}
                    type="audio"
                  />
                )}
                {msg.messageType === 'document' && (
                  <MediaPreview
                    mediaId={msg.content?.mediaId || ''}
                    type="document"
                    filename={msg.content?.filename || ''}
                  />
                )}
              </div>

              {/* Metadata (Time & Status) */}
              <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                <span className="text-[10px] min-w-[50px] text-right">
                  {format(new Date(msg.createdAt), 'p')}
                </span>
                {msg.direction === 'outgoing' && (
                  <span>
                    {msg.status === 'sent' && <span className="text-[10px]">✓</span>}
                    {msg.status === 'delivered' && <span className="text-[10px]">✓✓</span>}
                    {msg.status === 'read' && <span className={`text-[10px] ${msg.direction === 'outgoing' ? 'text-blue-200' : 'text-primary'}`}>✓✓</span>}
                    {(msg.status === 'failed' || msg.status === 'sending') && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 ${msg.status === 'failed' ? 'text-red-300' : 'text-current'}`}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="bg-card p-3 px-4 border-t border-border flex gap-2 items-end">
        <div className="flex gap-1">
          <label className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/30 mb-1 cursor-pointer transition-colors" title="Attach">
            <input type="file" className="hidden" onChange={handleMediaUpload} disabled={sending} />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </label>
          <button
            type="button"
            onClick={() => setShowTemplatePicker(true)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/30 mb-1 transition-colors"
            title="Send Template"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 bg-muted/40 rounded-xl border border-input focus-within:ring-2 focus-within:ring-primary focus-within:border-primary p-2 transition-all">
          <textarea
            className="w-full max-h-32 min-h-[40px] border-none bg-transparent outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            rows={1}
          />
        </div>
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mb-1 transition-all shadow-md active:scale-95"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </form>

      {showTemplatePicker && (
        <TemplatePicker
          onClose={() => setShowTemplatePicker(false)}
          onSelect={handleTemplateSelect}
        />
      )}
    </div>
  );
};

export default ChatWindow;
