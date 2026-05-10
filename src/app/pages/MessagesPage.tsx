import React, { useState, useEffect, useRef } from 'react';
import { supabase, API_BASE_URL } from '../../utils/supabase-client';
import {
  MessageSquare,
  Send,
  UserPlus,
  Search,
  X,
  Loader2,
  ChevronLeft,
  Paperclip,
  Image as ImageIcon,
  File,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useMessages, Contact, Conversation } from '../hooks/useMessages';
import { Button } from '../components/ui/button';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffH = (now.getTime() - date.getTime()) / 3600000;
  if (diffH < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─────────────────────────────────────────────
   Avatar
───────────────────────────────────────────── */
const AVATAR_COLORS: [string, string][] = [
  ['#3b82f6', '#dbeafe'],
  ['#8b5cf6', '#ede9fe'],
  ['#10b981', '#d1fae5'],
  ['#f59e0b', '#fef3c7'],
  ['#ef4444', '#fee2e2'],
  ['#06b6d4', '#cffafe'],
];

function colorForName(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg' }> = ({ name, size = 'md' }) => {
  const [fg, bg] = colorForName(name);
  const dim = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const fs = size === 'sm' ? 11 : size === 'lg' ? 16 : 13;
  return (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: fs,
        flexShrink: 0,
        border: `1.5px solid ${fg}22`,
      }}
    >
      {getInitials(name)}
    </div>
  );
};

/* ─────────────────────────────────────────────
   New Conversation Modal
───────────────────────────────────────────── */
interface NewChatModalProps {
  contacts: Contact[];
  onStart: (contact: Contact) => Promise<void>;
  onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ contacts, onStart, onClose }) => {
  const [query, setQuery] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      c.role.toLowerCase().includes(query.toLowerCase())
  );

  const handleStart = async (contact: Contact) => {
    setStarting(contact.id);
    try {
      await onStart(contact);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-72">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No contacts found
            </div>
          ) : (
            filtered.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleStart(contact)}
                disabled={starting === contact.id}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors border-b border-border last:border-0 text-left"
              >
                <Avatar name={contact.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                </div>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize text-muted-foreground shrink-0">
                  {contact.role}
                </span>
                {starting === contact.id && (
                  <Loader2 size={14} className="animate-spin text-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Conversation List Item
───────────────────────────────────────────── */
const ConversationItem: React.FC<{
  conv: Conversation;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}> = ({ conv, isSelected, currentUserId, onClick }) => {
  const name = conv.otherUser?.name ?? 'Unknown';
const preview =
  conv.lastMessage?.content ||
  (conv.lastMessage?.attachmentName ? `Attachment: ${conv.lastMessage.attachmentName}` : 'No messages yet');  const time = conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : '';
  const isUnread = conv.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-border transition-colors ${
        isSelected
          ? 'bg-primary/10 border-l-2 border-l-primary'
          : 'hover:bg-muted border-l-2 border-l-transparent'
      }`}
    >
      <div className="relative">
        <Avatar name={name} />
        {isUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
            {name}
          </p>
          <span className="text-xs text-muted-foreground ml-2 shrink-0">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate flex-1 ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
            {preview.length > 55 ? preview.slice(0, 55) + '...' : preview}
          </p>
          {conv.unreadCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium shrink-0">
              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const SignedImage: React.FC<{
  path: string;
  alt: string;
  accessToken: string | null;
  onClick?: () => void;
}> = ({ path, alt, accessToken, onClick }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const loadImageUrl = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(path)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.url) {
          setUrl(data.url);
        }
      } catch (error) {
        console.error('Failed to load image preview:', error);
      }
    };

    loadImageUrl();
  }, [path, accessToken]);

  if (!url) {
    return (
      <div className="w-48 h-32 rounded-xl bg-background/60 flex items-center justify-center text-xs text-muted-foreground">
        Loading image...
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="rounded-xl max-h-72 w-auto object-cover border border-black/10 cursor-pointer hover:opacity-95 transition"
      onClick={onClick}
    />
  );
};


/* ─────────────────────────────────────────────
   Chat Bubble
───────────────────────────────────────────── */
const ChatBubble: React.FC<{
  content: string;
  isOwn: boolean;
  time: string;
  senderName: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
  attachmentName?: string | null;
  attachmentPath?: string | null;
  attachmentType?: string | null;
  onDownload?: (path: string, name: string) => void;
}> = ({
  content,
  isOwn,
  time,
  senderName,
  deliveredAt,
  seenAt,
  attachmentName,
  attachmentPath,
  attachmentType,
  onDownload,
}) => {
  const isImage = attachmentType?.startsWith('image/');

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && <Avatar name={senderName} size="sm" />}

      <div
        className={`max-w-[72%] ${
          isOwn ? 'items-end' : 'items-start'
        } flex flex-col`}
      >
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words space-y-2 ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          }`}
        >
          {/* Message text */}
          {content && <p>{content}</p>}

          {/* Image Preview */}
          {isImage && attachmentPath && (
            <div className="space-y-2">
              <img
                src={`${API_BASE_URL}/files/${encodeURIComponent(attachmentPath)}`}
                alt={attachmentName || 'Image'}
                className="rounded-xl max-h-72 w-auto object-cover border border-black/10 cursor-pointer hover:opacity-95 transition"
                onClick={() =>
                  window.open(attachmentPath, '_blank')
                }
              />

              {attachmentName && (
                <button
                  type="button"
                  onClick={() =>
                    onDownload?.(attachmentPath, attachmentName)
                  }
                  className={`flex items-center gap-2 rounded-lg p-2 w-full text-left ${
                    isOwn
                      ? 'bg-white/15 hover:bg-white/20'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  <ImageIcon size={18} />
                  <span className="text-xs truncate flex-1">
                    {attachmentName}
                  </span>
                  <Download size={14} />
                </button>
              )}
            </div>
          )}

          {/* Non-image attachment */}
          {!isImage && attachmentPath && attachmentName && (
            <button
              type="button"
              onClick={() =>
                onDownload?.(attachmentPath, attachmentName)
              }
              className={`flex items-center gap-2 rounded-lg p-2 w-full text-left ${
                isOwn
                  ? 'bg-white/15 hover:bg-white/20'
                  : 'bg-background hover:bg-accent'
              }`}
            >
              <File size={18} />
              <span className="text-xs truncate flex-1">
                {attachmentName}
              </span>
              <Download size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 px-1">
         <span>{time}</span>

         {isOwn && deliveredAt && !seenAt && (
           <span className="text-blue-400">✓ Delivered</span>
       )}

        {isOwn && seenAt && (
         <span className="text-green-500">✓✓ Seen</span>
    )}
        </div>
      </div>
    </div>  
  );
};

/* ─────────────────────────────────────────────
   Main MessagesPage
───────────────────────────────────────────── */
export const MessagesPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const {
    conversations,
    currentMessages,
    selectedConversationId,
    contacts,
    loading,
    totalUnread,
    loadMessages,
    sendMessage,
    startConversation,
  } = useMessages(accessToken);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
  if (!user?.id) return;

  const channel = supabase
    .channel(`messages-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${user.id}`,
      },
      async (payload) => {
        const newMessage = payload.new as any;

        if (selectedConversationId && newMessage.sender_id === selectedConversationId) {
          await loadMessages(selectedConversationId);
        }

        toast.info('New message received');
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id, selectedConversationId, loadMessages]);


useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [currentMessages]);

const existingConv = conversations.find((c) => c.id === selectedConversationId);
const selectedContact = contacts.find((c) => c.id === selectedConversationId);

const selectedConv =
  existingConv ||
  (selectedContact
    ? {
        id: selectedContact.id,
        otherUser: {
          id: selectedContact.id,
          name: selectedContact.name,
          role: selectedContact.role,
        },
        lastMessage: null,
        unreadCount: 0,
        lastMessageAt: '',
      }
    : null);

  const filteredConversations = conversations.filter(
    (c) =>
      convSearch === '' ||
      (c.otherUser?.name ?? '').toLowerCase().includes(convSearch.toLowerCase())
  );

  const handleSelectConversation = async (convId: string) => {
    await loadMessages(convId);
    setShowMobileChat(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const downloadAttachment = async (path: string, name: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(path)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      toast.error(data.error || 'Failed to get file');
      return;
    }

    const link = document.createElement('a');
    link.href = data.url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch {
    toast.error('Failed to download attachment');
  }
};

const handleAttachmentUpload = async (file: File) => {
  if (!file || uploadingAttachment) return;

  setUploadingAttachment(true);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      toast.error(uploadData.error || 'Failed to upload attachment');
      return;
    }

    await sendMessage({
      content: input.trim(),
      attachmentName: uploadData.fileName,
      attachmentPath: uploadData.filePath || uploadData.path,
      attachmentType: file.type,
    });

    setInput('');
    toast.success('Attachment sent');
  } catch {
    toast.error('Failed to send attachment');
  } finally {
    setUploadingAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || uploadingAttachment) return;
    setSending(true);
    try {
      await sendMessage(input);
      setInput('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

const handleStartConversation = async (contact: Contact) => {
  try {
    await startConversation(contact.id);

    await loadMessages(contact.id);

    setShowNewChat(false);
    setShowMobileChat(true);

    setTimeout(() => inputRef.current?.focus(), 100);

    toast.success(`Conversation started with ${contact.name}`);
  } catch {
    toast.error('Failed to start conversation');
  }
};

  if (!user) return null;

  /* ── Sidebar ── */
  const ConversationSidebar = (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Messages</h2>
            {totalUnread > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-medium">
                {totalUnread}
              </span>
            )}
          </div>
          <Button
            onClick={() => setShowNewChat(true)}
            variant="secondary"
            className="h-8 px-3 text-xs gap-1.5"
          >
            <UserPlus size={13} />
            New
          </Button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={convSearch}
            onChange={(e) => setConvSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare size={40} className="text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {convSearch ? 'No results found' : 'No conversations yet'}
            </p>
            {!convSearch && (
              <p className="text-xs text-muted-foreground mt-1">Click "New" to start one</p>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isSelected={conv.id === selectedConversationId}
              currentUserId={user.id}
              onClick={() => handleSelectConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );

  /* ── Chat panel ── */
  const ChatPanel = (
    <div className="flex flex-col h-full bg-background">
      {selectedConversationId && selectedConv ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
            <button
              onClick={() => setShowMobileChat(false)}
              className="lg:hidden p-1.5 hover:bg-accent rounded-lg transition-colors -ml-1"
            >
              <ChevronLeft size={20} />
            </button>
            <Avatar name={selectedConv.otherUser?.name ?? 'Unknown'} />
            <div>
              <p className="font-semibold text-sm leading-tight">
                {selectedConv.otherUser?.name ?? 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {selectedConv.otherUser?.role ?? ''}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare size={36} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentMessages.map((msg) => (
                  <ChatBubble
                     key={msg.id}
                     content={msg.content}
                     isOwn={msg.senderId === user.id}
                     time={formatTime(msg.createdAt)}
                     senderName={
                      msg.sender?.name ??
                      (msg.senderId === user.id ? user.name : 'User')
         }
                     attachmentName={msg.attachmentName}
                     attachmentPath={msg.attachmentPath}
                     attachmentType={msg.attachmentType}
                     deliveredAt={msg.deliveredAt}
                     seenAt={msg.seenAt}
                     onDownload={downloadAttachment}
                />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-card">
<form onSubmit={handleSend} className="flex gap-2 items-center">
  <input
    ref={fileInputRef}
    type="file"
    className="hidden"
    accept="image/*,.pdf,.doc,.docx,.zip,.txt"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) handleAttachmentUpload(file);
    }}
  />

  <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    disabled={sending || uploadingAttachment}
    className="p-2.5 bg-muted text-foreground rounded-xl disabled:opacity-40 hover:bg-accent transition-all"
    title="Attach file"
  >
    {uploadingAttachment ? (
      <Loader2 size={18} className="animate-spin" />
    ) : (
      <Paperclip size={18} />
    )}
  </button>

  <input
    ref={inputRef}
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="Type a message..."
    disabled={sending || uploadingAttachment}
    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
  />

  <button
    type="submit"
    disabled={sending || uploadingAttachment || !input.trim()}
    className="p-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
  >
    {sending ? (
      <Loader2 size={18} className="animate-spin" />
    ) : (
      <Send size={18} />
    )}
  </button>
</form>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <MessageSquare size={36} className="text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Your messages</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            Select a conversation from the list, or start a new one to begin.
          </p>
          <Button onClick={() => setShowNewChat(true)} variant="primary" className="gap-2">
            <UserPlus size={16} />
            Start a conversation
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col p-4 md:p-6" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Desktop title */}
      <div className="hidden lg:flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm">
            Chat with teachers, students, and admins
          </p>
        </div>
      </div>

      {/* Main split */}
      <div className="flex flex-1 min-h-0 rounded-xl border border-border overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div
          className={`w-full lg:w-80 xl:w-96 shrink-0 flex flex-col ${
            showMobileChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {ConversationSidebar}
        </div>

        {/* Chat */}
        <div
          className={`flex-1 min-w-0 flex flex-col ${
            showMobileChat ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {ChatPanel}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          contacts={contacts}
          onStart={handleStartConversation}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  );
};