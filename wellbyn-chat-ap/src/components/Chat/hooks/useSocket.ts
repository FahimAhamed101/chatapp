import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from './hooks';
import { chatApi, Message } from '@/redux/features/chat/chatApi';
import { getLocalStorageItem } from '@/lib/browserStorage';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth?.user);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const token = getLocalStorageItem("accessToken");
    
    if (!token) {
      console.log('❌ No token found, skipping socket connection');
      return;
    }

    // Prevent duplicate connections
    if (socketRef.current?.connected) {
      console.log('✅ Socket already connected');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    console.log('🔌 Attempting to connect to socket:', socketUrl);
    console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...');

 
    const socket = io(socketUrl, {
      auth: {
        token: token, 
      },
      query: {
        token: token, 
      },
   
      transportOptions: {
        polling: {
          extraHeaders: {
            'token': token,
            'authorization': `Bearer ${token}`
          }
        }
      },
      transports: ['polling', 'websocket'], 
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 10000,
      upgrade: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully!', {
        socketId: socket.id,
        transport: socket.io.engine.transport.name
      });
      reconnectAttemptsRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.error('❌ Socket disconnected:', {
        reason,
        socketId: socket.id,
        willReconnect: socket.active
      });

      if (reason === 'io server disconnect') {
        console.error('🚨 Server forcefully disconnected - AUTH FAILED!');
        console.error('💡 Check if token is being sent correctly');
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Attempting manual reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          setTimeout(() => {
            socket.connect();
          }, 3000);
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.error('⚠️ Socket connection error:', {
        message: error.message,
        description: error.toString(),
      });
    });

    socket.on('error', (error: any) => {
      console.error('⚠️ Socket error:', error);
    });

    // Listen for incoming messages
    socket.on('chat:message', (data: { conversationId: string; message: Message }) => {
      console.log('📨 Received real-time message:', {
        conversationId: data.conversationId,
        messageId: data.message._id,
        content: data.message.content.substring(0, 50) + '...',
        senderId: data.message.senderId,
        senderRole: data.message.senderRole,
        isFromMe: data.message.senderId === user?.id
      });

      // Invalidate tags to force refetch
      dispatch(
        chatApi.util.invalidateTags([
          { type: 'Messages', id: data.conversationId }
        ])
      );

      // Also do manual update as backup
      setTimeout(() => {
        try {
          dispatch(
            chatApi.util.updateQueryData(
              'listMessages',
              { conversationId: data.conversationId, limit: 200 },
              (draft) => {
                const exists = draft.data.some((msg) => msg._id === data.message._id);
                if (!exists) {
                  draft.data = [...draft.data, data.message];
                  console.log('✅ Message added to cache. Total:', draft.data.length);
                }
              }
            )
          );
        } catch (error) {
          console.error('❌ Error updating messages cache:', error);
        }
      }, 100);

      // Update conversation list
      try {
        dispatch(
          chatApi.util.updateQueryData('listConversations', { page: 1, limit: 20 }, (draft) => {
            const conversation = draft.data.find((conv) => conv.conversationId === data.conversationId);
            if (conversation) {
              conversation.lastMessageText = data.message.content;
              conversation.lastMessageSenderRole = data.message.senderRole;
              conversation.lastMessageAt = data.message.createdAt;

              if (data.message.senderId !== user?.id) {
                conversation.unreadCount = (conversation.unreadCount || 0) + 1;
              }

              const index = draft.data.indexOf(conversation);
              if (index > 0) {
                draft.data.splice(index, 1);
                draft.data.unshift(conversation);
              }
              console.log('✅ Conversation updated');
            }
          })
        );
      } catch (error) {
        console.error('❌ Error updating conversations:', error);
      }
    });

    // Listen for read receipts
    socket.on('chat:read', (data: { conversationId: string; readerRole: 'user' | 'sender' }) => {
      console.log('👁️ Messages marked as read:', data);

      dispatch(
        chatApi.util.invalidateTags([
          { type: 'Messages', id: data.conversationId }
        ])
      );

      if (data.readerRole === user?.role) {
        try {
          dispatch(
            chatApi.util.updateQueryData('listConversations', { page: 1, limit: 20 }, (draft) => {
              const conversation = draft.data.find((conv) => conv.conversationId === data.conversationId);
              if (conversation) {
                conversation.unreadCount = 0;
              }
            })
          );
        } catch (error) {
          console.error('❌ Error clearing unread:', error);
        }
      }
    });

    return () => {
      console.log('🔌 Cleaning up socket connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('error');
      socket.off('chat:message');
      socket.off('chat:read');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dispatch, user?.id, user?.role]);

  return {
    socket: socketRef.current,
  };
};
