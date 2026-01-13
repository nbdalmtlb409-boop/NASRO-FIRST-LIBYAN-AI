export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  image?: string; // Base64 string for user uploads or generated images
  isGeneratedImage?: boolean; // Flag to distinguish generated images
}
