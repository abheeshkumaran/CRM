import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { useSocket } from '../../contexts/useSocket';

interface Conversation {
  phoneNumber: string;
  displayName: string;
  lastMessage?: string | { text?: string, templateName?: string };
  lastMessageAt: string;
  messageType: string;
  unreadCount?: number;
  lastAgentId?: string;
  lastAgentName?: string;
  ownerId?: string;
}

interface ConversationListProps {
  onSelectConversation: (phone: string) => void;
  selectedPhone: string | null;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation, selectedPhone }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const { socket } = useSocket();
  const userId = JSON.parse(localStorage.getItem('userInfo') || '{}').id;

  const fetchConversations = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/whatsapp/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations(true);

    // Polling as a fallback (longer interval)
    const interval = setInterval(() => fetchConversations(false), 60000);

    // Socket listener
    if (socket) {
      const handleNewMessage = (data: { message: { content: string, sentAt?: string, createdAt?: string, messageType: string }, phoneNumber: string }) => {

        setConversations(prev => {
          const existingIdx = prev.findIndex(c => c.phoneNumber === data.phoneNumber);

          if (existingIdx > -1) {
            // Update existing conversation
            const updated = [...prev];
            const conversation = { ...updated[existingIdx] };

            conversation.lastMessage = data.message.content;
            conversation.lastMessageAt = data.message.sentAt || data.message.createdAt || new Date().toISOString();
            conversation.messageType = data.message.messageType;

            updated.splice(existingIdx, 1);
            return [conversation, ...updated];
          } else {
            // New conversation (refresh the whole list to get display name etc.)
            fetchConversations(false);
            return prev;
          }
        });
      };

      socket.on('whatsapp_message_received', handleNewMessage);

      socket.on('whatsapp_conversation_read', (data: { phoneNumber: string }) => {
        setConversations(prev => prev.map(c => {
          if (c.phoneNumber === data.phoneNumber) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        }));
      });

      return () => {
        clearInterval(interval);
        socket.off('whatsapp_message_received', handleNewMessage);
        socket.off('whatsapp_conversation_read');
      };
    }

    return () => clearInterval(interval);
  }, [socket, fetchConversations]);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.phoneNumber.includes(search);

    if (!matchesSearch) return false;

    if (filter === 'mine') {
      return c.lastAgentId === userId || c.ownerId === userId;
    }

    if (selectedAgentId !== 'all') {
      return c.lastAgentId === selectedAgentId || c.ownerId === selectedAgentId;
    }

    return true;
  });

  const agents = Array.from(new Set(
    conversations
      .filter(c => c.lastAgentId && c.lastAgentName)
      .map(c => JSON.stringify({ id: c.lastAgentId, name: c.lastAgentName }))
  )).map(s => JSON.parse(s)) as { id: string, name: string }[];

  const getMessagePreview = (conv: Conversation) => {
    if (!conv.lastMessage) return 'No content';
    if (typeof conv.lastMessage === 'string') return conv.lastMessage;

    const lastMsg = conv.lastMessage;
    if (conv.messageType === 'text') return lastMsg.text || 'Text message';
    if (conv.messageType === 'image') return '📷 Image';
    if (conv.messageType === 'document') return '📄 Document';
    if (conv.messageType === 'audio') return '🎤 Audio';
    if (conv.messageType === 'video') return '🎥 Video';
    if (conv.messageType === 'template') return `📋 Template: ${lastMsg.templateName}`;
    return 'Message';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-card">
      <div className="px-3 pt-3 bg-card border-b border-border space-y-3">
        <div className="flex p-1 bg-muted/50 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === 'all'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            All Chats
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === 'mine'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            My Chats
          </button>
        </div>
        
        {agents.length > 0 && filter === 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Filter By Agent:</span>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="flex-1 bg-muted/30 border-none text-[11px] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="pb-3">
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:bg-background outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No conversations found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conv) => (
              <div
                key={conv.phoneNumber}
                onClick={() => onSelectConversation(conv.phoneNumber)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-muted/50 ${selectedPhone === conv.phoneNumber ? 'bg-muted shadow-inner' : ''
                  }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden shrink-0 shadow-lg">
                    {conv.displayName.charAt(0).toUpperCase()}
                  </div>
                  {/* Online indicator could go here */}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-sm font-semibold truncate ${selectedPhone === conv.phoneNumber ? 'text-foreground' : 'text-foreground'}`}>
                      {conv.displayName}
                    </h3>
                    {conv.lastMessageAt && (
                      <span className={`text-[10px] shrink-0 font-medium ${conv.unreadCount && conv.unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false }).replace('about ', '')}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-xs truncate flex-1 leading-relaxed ${conv.unreadCount && conv.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {getMessagePreview(conv)}
                    </p>
                    {conv.unreadCount && conv.unreadCount > 0 ? (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-primary/30">
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
