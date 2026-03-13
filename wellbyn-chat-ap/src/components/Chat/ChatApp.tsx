'use client'

import { useEffect, useRef, useState, Suspense } from 'react';
import type { FC } from 'react';
import {
  Filter,
  LogOut,
  Mail,
  MessageCircleMore,
  Search,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { logout } from '@/redux/features/auth/authSlice';
import {
  Contact,
  useGetOrCreateConversationMutation,
  useListContactsQuery,
  useListConversationsQuery,
  useListMessagesQuery,
  useMarkReadMutation,
  useSendMessageMutation,
} from '@/redux/features/chat/chatApi';
import { useSocket } from './hooks/useSocket';
import { useAppDispatch, useAppSelector } from './hooks/hooks';

interface ChatWindowProps {
  conversationId?: string;
  contactName?: string;
}

interface InboxSidebarProps {
  onSelectConversation: (conversationId: string, contactName: string) => void;
  selectedConversationId?: string | null;
  userIdFilter?: string;
}

const getDisplayName = (user: {
  firstName?: string;
  lastName?: string;
  email?: string;
} | null) => {
  if (!user) return 'Guest';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.email || 'Guest';
};

const ChatWindow = ({ conversationId, contactName }: ChatWindowProps) => {
  const [message, setMessage] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentUser = useAppSelector((state) => state.auth?.user);

  const {
    data: messagesData,
    isLoading,
    error,
  } = useListMessagesQuery(
    { conversationId: conversationId || '', limit: 200 },
    {
      skip: !conversationId,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [markRead] = useMarkReadMutation();
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      console.log('Socket status:', {
        connected: socket.connected,
        id: socket.id,
      });
    }
  }, [socket?.connected]);

  useEffect(() => {
    if (conversationId) {
      console.log('Marking conversation as read:', conversationId);
      markRead(conversationId);
    }
  }, [conversationId, markRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.data, filterRole]);

  useEffect(() => {
    if (messagesData?.data) {
      console.log('Messages updated:', {
        conversationId,
        totalMessages: messagesData.data.length,
        latestMessage: messagesData.data[messagesData.data.length - 1]?.content,
      });
    }
  }, [messagesData?.data, conversationId]);

  const handleSendMessage = async () => {
    if (message.trim() && !isSending && conversationId) {
      try {
        console.log('Sending message:', {
          conversationId,
          content: message.trim(),
        });
        await sendMessage({
          conversationId,
          content: message.trim(),
        }).unwrap();
        setMessage('');
        console.log('Message sent successfully');
      } catch (sendError) {
        console.error('Failed to send message:', sendError);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const messages = messagesData?.data || [];
  const filteredMessages =
    filterRole === 'all'
      ? messages
      : messages.filter((msg) => msg.senderRole === filterRole);

  return (
    <section className="flex min-h-[72vh] flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-800 to-sky-700 px-6 py-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-sky-200/90">
              Live Inbox
            </div>
            <h2 className="mt-1 text-2xl font-semibold">
              {contactName || 'Select a conversation'}
            </h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  socket?.connected ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span>
                {socket?.connected ? 'Realtime connected' : 'Realtime disconnected'}
              </span>
            </div>
          </div>

          {conversationId && (
            <div className="flex items-center gap-3 self-start rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">
              <Filter className="h-4 w-4 text-sky-100" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-transparent text-sm font-medium text-white outline-none"
              >
                <option value="all" className="text-slate-900">
                  All Messages
                </option>
                <option value="user" className="text-slate-900">
                  User Only
                </option>
                <option value="sender" className="text-slate-900">
                  Sender Only
                </option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-5 sm:px-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
              Loading messages...
            </div>
          </div>
        ) : !conversationId ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-8 py-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <MessageCircleMore className="h-7 w-7" />
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-800">
                Choose a conversation
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Messages will appear here once you select a contact from the inbox.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-8 py-8 text-center text-rose-600 shadow-sm">
              <p className="text-base font-semibold">Error loading messages</p>
              <p className="mt-2 text-sm">Unknown error</p>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-[24px] border border-slate-200 bg-white px-8 py-8 text-center shadow-sm">
              <p className="text-base font-semibold text-slate-800">
                No messages {filterRole !== 'all' ? `from ${filterRole}` : 'yet'}
              </p>
              {filterRole !== 'all' && (
                <button
                  onClick={() => setFilterRole('all')}
                  className="mt-3 text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  Show all messages
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg) => {
              const isUserMessage = msg.senderRole === 'user';
              const messageDate = new Date(msg.createdAt);
              const formattedTime = messageDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isOwnMessage = msg.senderId === currentUser?.id;

              return (
                <div key={msg._id}>
                  <div
                    className={`flex items-end gap-3 ${
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-sm font-semibold text-white shadow-sm">
                        {isUserMessage ? 'U' : 'S'}
                      </div>
                    )}

                    <div
                      className={`max-w-[78%] rounded-[22px] px-4 py-3 shadow-sm ${
                        isOwnMessage
                          ? 'rounded-br-md bg-sky-600 text-white'
                          : 'rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200'
                      }`}
                    >
                      <div
                        className={`mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isOwnMessage ? 'text-sky-100' : 'text-emerald-600'
                        }`}
                      >
                        <span>{isUserMessage ? 'User' : 'Sender'}</span>
                        {isOwnMessage && <span className="tracking-normal">You</span>}
                      </div>

                      <p className="text-sm leading-6 break-words">{msg.content}</p>
                      <span
                        className={`mt-2 block text-right text-xs ${
                          isOwnMessage ? 'text-sky-100/90' : 'text-slate-400'
                        }`}
                      >
                        {formattedTime}
                      </span>
                    </div>

                    {isOwnMessage && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-2 shadow-inner">
          <input
            type="text"
            placeholder="Type your message"
            className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-50"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!conversationId || isSending}
          />
          <button
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white transition hover:bg-sky-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSendMessage}
            disabled={!conversationId || isSending || !message.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

const InboxSidebar: FC<InboxSidebarProps> = ({
  onSelectConversation,
  selectedConversationId,
  userIdFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversationsData, isLoading, error } = useListConversationsQuery({
    page: 1,
    limit: 20,
  });
  const { data: contactsData, isLoading: isLoadingContacts } = useListContactsQuery({
    search: searchQuery || undefined,
  });
  const [getOrCreateConversation, { isLoading: isCreatingConversation }] =
    useGetOrCreateConversationMutation();

  const conversations = conversationsData?.data || [];
  const contacts = contactsData?.data || [];

  const filteredConversations = conversations.filter((conversation) => {
    const contact = conversation.user || conversation.sender;
    const contactName = contact?.name || '';
    const matchesSearch = contactName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesUser = userIdFilter
      ? conversation.user?.id === userIdFilter
      : true;

    return matchesSearch && matchesUser;
  });

  const handleStartConversation = async (contact: Contact) => {
    try {
      const result = await getOrCreateConversation({
        recipientId: contact.id,
        recipientModel: contact.model,
      }).unwrap();

      onSelectConversation(result.conversationId, contact.name || contact.email || 'Unknown');
    } catch (startError) {
      console.error('Failed to start conversation:', startError);
    }
  };

  return (
    <aside className="w-full rounded-[28px] border border-slate-200 bg-white/90 p-3 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur md:w-[360px]">
      <div className="rounded-[24px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-5 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-sky-200">
              Inbox
            </div>
            <h2 className="mt-1 text-2xl font-semibold">Conversations</h2>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
            {filteredConversations.length}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/12 px-3 py-3 text-sm font-medium text-white">
            <MessageCircleMore className="h-4 w-4" />
            <span>Chat</span>
          </div>

          <Link
            href="/inbox/sms"
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <MessageCircleMore className="h-4 w-4" />
            <span>SMS</span>
          </Link>

          <Link
            href="/inbox/email"
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </Link>
        </div>
      </div>

      <div className="px-2 pb-2 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-sm text-slate-500">
            Loading...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-14 text-sm text-rose-500">
            Error loading conversations
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Recent Conversations
                </p>
              </div>

              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => {
                  const conversationId = conversation.conversationId;
                  const contact = conversation.user || conversation.sender;
                  const contactName = contact?.name || 'Unknown';
                  const profilePicture = contact?.profilePicture;
                  const lastMessage = conversation.lastMessageText;
                  const unreadCount = conversation.unreadCount || 0;
                  const isSelected = conversationId === selectedConversationId;

                  return (
                    <button
                      key={conversationId}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-sky-200 bg-sky-50 shadow-sm'
                          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => onSelectConversation(conversationId, contactName)}
                    >
                      <div className="relative flex-shrink-0">
                        {profilePicture ? (
                          <img
                            src={profilePicture}
                            alt={contactName}
                            className="h-12 w-12 rounded-2xl object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback =
                                e.currentTarget.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white"
                          style={{ display: profilePicture ? 'none' : 'flex' }}
                        >
                          {contactName.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {contactName}
                          </span>
                          {unreadCount > 0 && (
                            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-sky-600 px-2 py-1 text-[11px] font-semibold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No conversations yet. Start one from the registered users list below.
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Registered Users
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Start a chat with any registered account.
                  </p>
                </div>
              </div>

              {isLoadingContacts ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  Loading registered users...
                </div>
              ) : contacts.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No registered users available.
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => {
                    const contactLabel = contact.name || contact.email || 'Unknown';

                    return (
                      <button
                        key={`${contact.model}-${contact.id}`}
                        type="button"
                        onClick={() => handleStartConversation(contact)}
                        disabled={isCreatingConversation}
                        className="flex w-full items-center gap-3 rounded-[20px] border border-transparent bg-slate-50 px-3 py-3 text-left transition hover:border-slate-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {contact.profilePicture ? (
                          <img
                            src={contact.profilePicture}
                            alt={contactLabel}
                            className="h-11 w-11 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sm font-semibold text-sky-700">
                            {contactLabel.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-800">
                            {contactLabel}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {contact.email || 'No email'}
                          </div>
                        </div>

                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                          {contact.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

function ChatAppInner() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth?.user);
  const searchParams = useSearchParams();
  const userIdFilter =
    searchParams.get('userIdFilter') ||
    searchParams.get('userId') ||
    searchParams.get('doctorIdFilter') ||
    searchParams.get('doctorId') ||
    undefined;
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');

  const displayName = getDisplayName(currentUser);
  const roleLabel =
    currentUser?.role === 'user'
      ? 'User'
      : currentUser?.role === 'sender'
        ? 'Sender'
        : 'Account';

  const handleSelectConversation = (conversationId: string, name: string) => {
    console.log('Selected conversation:', conversationId, name);
    setSelectedConversation(conversationId);
    setContactName(name);
  };

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fafc_35%,#e2e8f0_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="mb-6 overflow-hidden rounded-[32px] border border-slate-200 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex flex-col gap-5 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#eff6ff_100%)] px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg">
                <MessageCircleMore className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.34em] text-slate-500">
                  Wellbyn Chat
                </div>
                <h1 className="mt-1 text-3xl font-semibold text-slate-900">
                  Messages workspace
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Review conversations, track realtime status, and respond without
                  leaving the inbox.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {displayName}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {currentUser?.email || 'No email'}
                  </div>
                </div>
                <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {roleLabel}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-5 xl:flex-row">
          <InboxSidebar
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation}
            userIdFilter={userIdFilter}
          />
          <ChatWindow
            conversationId={selectedConversation || undefined}
            contactName={contactName}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatApp() {
  return (
    <Suspense fallback={<div className="p-5 text-gray-500">Loading inbox...</div>}>
      <ChatAppInner />
    </Suspense>
  );
}
