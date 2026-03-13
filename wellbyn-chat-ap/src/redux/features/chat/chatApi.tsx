import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../store';
import { getLocalStorageItem } from '@/lib/browserStorage';

export interface Message {
  _id: string;
  conversationId: string;
  senderRole: 'user' | 'sender';
  senderId: string;
  content: string;
  readByUser: boolean;
  readBySender: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  conversationId: string;
  lastMessageText?: string;
  lastMessageSenderRole?: 'user' | 'sender';
  lastMessageAt?: string;
  clinic?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    discipline?: string;
    officeLocation?: string[];
    profilePicture?: string;
  };
  sender?: {
    id: string;
    name: string;
    profilePicture?: string;
  };
  unreadCount?: number;
}

export interface Contact {
  id: string;
  name?: string;
  email?: string;
  role: 'user' | 'sender';
  model: 'Doctor' | 'User';
  profilePicture?: string;
}

interface ConversationsResponse {
  total: number;
  page: number;
  limit: number;
  data: Conversation[];
}

interface ContactsResponse {
  data: Contact[];
}

interface MessagesResponse {
  data: Message[];
  limit: number;
}

interface CreateConversationRequest {
  recipientId?: string;
  recipientModel?: 'Doctor' | 'User';
  userId?: string;
  senderId?: string;
}

interface CreateConversationResponse {
  conversationId: string;
}

interface SendMessageRequest {
  conversationId: string;
  content: string;
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_Chat_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getLocalStorageItem("accessToken");
      console.log('🔑 Token for API:', token ? 'EXISTS' : 'MISSING');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Conversation', 'Messages'],
  endpoints: (builder) => ({
    getOrCreateConversation: builder.mutation<CreateConversationResponse, CreateConversationRequest>({
      query: (body) => ({
        url: '/chat/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversation'],
    }),

    listContacts: builder.query<ContactsResponse, { search?: string }>({
      query: ({ search }) => ({
        url: '/chat/contacts',
        params: search ? { search } : undefined,
      }),
    }),

    listConversations: builder.query<ConversationsResponse, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => {
        console.log('📞 Calling listConversations API');
        return {
          url: '/chat/conversations',
          params: { page, limit },
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ conversationId }) => ({ type: 'Conversation' as const, id: conversationId })),
              { type: 'Conversation', id: 'LIST' },
            ]
          : [{ type: 'Conversation', id: 'LIST' }],
    }),

    listMessages: builder.query<MessagesResponse, { conversationId: string; before?: string; limit?: number }>({
      query: ({ conversationId, before, limit = 200 }) => {
        const url = `/chat/conversations/${conversationId}/messages`;
        console.log('📞 Calling listMessages API:', url);
        console.log('📦 Params:', { conversationId, before, limit });
        return {
          url,
          params: { before, limit },
        };
      },
      // Force refetch when conversation changes
      keepUnusedDataFor: 0,
      providesTags: (result, error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    sendMessage: builder.mutation<Message, SendMessageRequest>({
      query: ({ conversationId, content }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        method: 'POST',
        body: { content },
      }),
      async onQueryStarted({ conversationId, content }, { dispatch, queryFulfilled, getState }) {
        const state = getState() as RootState;
        const currentUser = state.auth?.user;

        const patchResult = dispatch(
          chatApi.util.updateQueryData('listMessages', { conversationId, limit: 200 }, (draft) => {
            const tempMessage: Message = {
              _id: `temp-${Date.now()}`,
              conversationId,
              senderRole: currentUser?.role as 'user' | 'sender',
              senderId: currentUser?.id || '',
              content,
              readByUser: currentUser?.role === 'user',
              readBySender: currentUser?.role === 'sender',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            draft.data.push(tempMessage);
          })
        );

        try {
          const { data: newMessage } = await queryFulfilled;
          
          dispatch(
            chatApi.util.updateQueryData('listMessages', { conversationId, limit: 200 }, (draft) => {
              const index = draft.data.findIndex((msg) => msg._id.startsWith('temp-'));
              if (index !== -1) {
                draft.data[index] = newMessage;
              }
            })
          );

          dispatch(
            chatApi.util.updateQueryData('listConversations', { page: 1, limit: 20 }, (draft) => {
              const conversation = draft.data.find((conv) => conv.conversationId === conversationId);
              if (conversation) {
                conversation.lastMessageText = content;
                conversation.lastMessageSenderRole = currentUser?.role as 'user' | 'sender';
                conversation.lastMessageAt = newMessage.createdAt;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        { type: 'Conversation', id: conversationId },
      ],
    }),

    markRead: builder.mutation<void, string>({
      query: (conversationId) => ({
        url: `/chat/conversations/${conversationId}/read`,
        method: 'POST',
      }),
      async onQueryStarted(conversationId, { dispatch, queryFulfilled, getState }) {
        const state = getState() as RootState;
        const currentRole = state.auth?.user?.role;

        const patchResult = dispatch(
          chatApi.util.updateQueryData('listMessages', { conversationId, limit: 200 }, (draft) => {
            draft.data.forEach((msg) => {
              if (currentRole === 'user') {
                msg.readByUser = true;
              } else if (currentRole === 'sender') {
                msg.readBySender = true;
              }
            });
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, conversationId) => [
        { type: 'Messages', id: conversationId },
        { type: 'Conversation', id: conversationId },
      ],
    }),
  }),
});

export const {
  useGetOrCreateConversationMutation,
  useListContactsQuery,
  useListConversationsQuery,
  useListMessagesQuery,
  useSendMessageMutation,
  useMarkReadMutation,
} = chatApi;
