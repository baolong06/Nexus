export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface ProjectState {
  code: string;
  language: string;
  status: 'idle' | 'generating' | 'testing' | 'error';
  testResults?: {
    passed: boolean;
    errors: string[];
    logs: string[];
  };
}
