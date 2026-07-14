import React, { useState } from 'react';
import ConversationList from '../components/WhatsApp/ConversationList';
import ChatWindow from '../components/WhatsApp/ChatWindow';

const WhatsAppInbox: React.FC = () => {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Conversation List Sidebar */}
      <div className={`${selectedPhone ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-border bg-card`}>
        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
          <h2 className="text-xl font-semibold text-foreground">Inbox</h2>
          {/* Potential place for "New Chat" button */}
        </div>
        <ConversationList
          onSelectConversation={setSelectedPhone}
          selectedPhone={selectedPhone}
        />
      </div>

      {/* Chat Window */}
      <div className={`${!selectedPhone ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-background relative`}>
        {selectedPhone ? (
          <ChatWindow
            phoneNumber={selectedPhone}
            onBack={() => setSelectedPhone(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/20">
            <div className="w-64 h-64 bg-primary/5 rounded-full mb-6 flex items-center justify-center border border-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32 text-primary/20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">WhatsApp for CRM</h3>
            <p className="max-w-md text-muted-foreground">Select a conversation from the left to start messaging your leads and contacts.</p>
            <div className="mt-8 text-sm text-muted-foreground/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              End-to-End Encrypted via Meta Cloud API
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
