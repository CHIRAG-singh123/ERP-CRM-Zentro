export interface User {
  _id: string;
  name: string;
  email: string;
  profile?: {
    avatar?: string;
  };
  role?: string;
}

export interface ChatGroup {
  _id: string;
  name: string;
  description: string;
  type: 'group' | 'individual';
  createdBy: User | string;
  members: User[];
  avatar?: string;
  tenantId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface MessageRead {
  userId: string;
  readAt: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: User | string;
  content: string;
  type: 'text' | 'file' | 'image';
  attachments?: MessageAttachment[];
  readBy?: MessageRead[];
  replyTo?: Message | string | null;
  tenantId?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  _id: string;
  userId: string;
  chatId: string;
  lastReadAt: string;
  muted: boolean;
  role: 'admin' | 'member';
  joinedAt: string;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatWithMetadata extends ChatGroup {
  lastMessage?: Message | null;
  unreadCount: number;
  lastReadAt: string;
}

export interface ChatListResponse {
  chats: ChatWithMetadata[];
}

export interface ChatDetailResponse {
  chat: ChatGroup;
  participant: ChatParticipant | null;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  members?: string[];
  avatar?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  avatar?: string;
}

export interface CreateIndividualChatRequest {
  userId: string;
}

export interface AddMembersRequest {
  members: string[];
}

export interface SearchChatsResponse {
  chats: ChatGroup[];
  messages: Message[];
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  type?: 'text' | 'file' | 'image';
  attachments?: MessageAttachment[];
  replyTo?: string | null;
}

