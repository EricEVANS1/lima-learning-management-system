/**
 * useMessages Hook
 * Manages conversation-based messaging state with real-time polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../../utils/supabase-client';

export interface Message {
  id: string;
  conversationId?: string;
  senderId: string;
  recipientId?: string;
  content: string;
  createdAt: string;
  readBy?: string[];
  attachmentName?: string | null;
  attachmentPath?: string | null;
  attachmentType?: string | null;
  sender?: {
    id: string;
    name: string;
  };
}

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    role: string;
  } | null;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
    attachmentName?: string | null;
    attachmentType?: string | null;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SendMessagePayload {
  content?: string;
  attachmentName?: string | null;
  attachmentPath?: string | null;
  attachmentType?: string | null;
}

const POLL_INTERVAL = 4000;

export function useMessages(accessToken: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCheckRef = useRef<string>(new Date().toISOString());

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });

  const loadConversations = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        const convs: Conversation[] = data.conversations || [];
        setConversations(convs);
        setTotalUnread(convs.reduce((sum, c) => sum + c.unreadCount, 0));
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }, [accessToken]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!accessToken) return;

      setLoading(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}/messages/conversations/${conversationId}/messages`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (res.ok) {
          const data = await res.json();
          setCurrentMessages(data.messages || []);
          setSelectedConversationId(conversationId);
          await loadConversations();
        }
      } catch (e) {
        console.error('Failed to load messages:', e);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, loadConversations]
  );

  const sendMessage = useCallback(
    async (payload: string | SendMessagePayload) => {
      if (!selectedConversationId || !accessToken) return;

      const body: SendMessagePayload =
        typeof payload === 'string'
          ? { content: payload.trim() }
          : {
              content: payload.content?.trim() || '',
              attachmentName: payload.attachmentName || null,
              attachmentPath: payload.attachmentPath || null,
              attachmentType: payload.attachmentType || null,
            };

      if (!body.content && !body.attachmentPath) return;

      const res = await fetch(
        `${API_BASE_URL}/messages/conversations/${selectedConversationId}/messages`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) throw new Error('Failed to send');

      const data = await res.json();
      setCurrentMessages((prev) => [...prev, data.message]);
      await loadConversations();
    },
    [selectedConversationId, accessToken, loadConversations]
  );

const startConversation = useCallback(async (otherUserId: string): Promise<string> => {
  if (!accessToken) throw new Error('No token');

  // Current app does not use a conversations table.
  // The conversation id is the other user's profile id.
  await loadMessages(otherUserId);

  return otherUserId;
}, [accessToken, loadMessages]);

  const loadContacts = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/messages/contacts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error('Failed to load contacts:', e);
    }
  }, [accessToken]);

  const pollForNew = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/messages/new?since=${encodeURIComponent(lastCheckRef.current)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.ok) {
        const data = await res.json();

        if (data.count > 0) {
          await loadConversations();

          if (
            selectedConversationId &&
            data.newMessages?.some(
              (m: Message) =>
                m.conversationId === selectedConversationId ||
                m.senderId === selectedConversationId
            )
          ) {
            const msgRes = await fetch(
              `${API_BASE_URL}/messages/conversations/${selectedConversationId}/messages`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (msgRes.ok) {
              const msgData = await msgRes.json();
              setCurrentMessages(msgData.messages || []);
            }
          }
        }
      }
    } catch (e) {
      // silent poll failure
    } finally {
      lastCheckRef.current = new Date().toISOString();
    }
  }, [accessToken, selectedConversationId, loadConversations]);

  useEffect(() => {
    loadConversations();
    loadContacts();

    pollRef.current = setInterval(pollForNew, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadConversations, loadContacts, pollForNew]);

  return {
    conversations,
    currentMessages,
    selectedConversationId,
    contacts,
    loading,
    totalUnread,
    loadMessages,
    sendMessage,
    startConversation,
    loadContacts,
    loadConversations,
  };
}