// types.ts
export type ExtractedInfo = { 
  name: string; 
  email: string; 
  phone: string; 
};

export type ChatMessage = { 
  id: number; 
  role: "assistant" | "user"; 
  content: string; 
  timestamp: number;
};

export type Question = {
  id: number;
  text: string;
  level: "easy" | "medium" | "hard";
  timeLimit: number;
  answer?: string;
  timeTaken?: number;
};

export type InterviewSession = {
  id: string;
  extractedInfo: ExtractedInfo;
  messages: ChatMessage[];
  userData: ExtractedInfo;
  verified: boolean;
  interviewStarted: boolean;
  interviewCompleted: boolean;
  questions: Question[];
  currentQuestionIndex: number;
  timeLeft: number | null;
  finalScore?: number;
  finalSummary?: string;
  startedAt?: number;
  completedAt?: number;
  isPaused: boolean;
  lastActiveAt: number;
};
