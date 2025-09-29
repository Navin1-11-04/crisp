import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { InterviewSession, ChatMessage, ExtractedInfo, Question } from "./types";


const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

interface InterviewState {
  currentSession: InterviewSession | null;
  completedSessions: InterviewSession[];
}

const initialState: InterviewState = {
  currentSession: null,
  completedSessions: []
};

const interviewSlice = createSlice({
  name: "interview",
  initialState,
  reducers: {
    createNewSession: (state, action: PayloadAction<ExtractedInfo>) => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const initialMessage: ChatMessage = {
        id: 1,
        role: "assistant",
        content: "Hi! I've extracted some details from your resume. Can you help me confirm or fill in the missing info?",
        timestamp: Date.now()
      };

      state.currentSession = {
        id: sessionId,
        extractedInfo: action.payload,
        messages: [initialMessage],
        userData: action.payload,
        verified: false,
        interviewStarted: false,
        interviewCompleted: false,
        questions: [],
        currentQuestionIndex: 0,
        timeLeft: null,
        isPaused: false,
        lastActiveAt: Date.now()
      };
    },

    updateCurrentSession: (state, action: PayloadAction<Partial<InterviewSession>>) => {
      if (state.currentSession) {
        state.currentSession = {
          ...state.currentSession,
          ...action.payload,
          lastActiveAt: Date.now()
        };
      }
    },

    addMessage: (state, action: PayloadAction<Omit<ChatMessage, "id" | "timestamp">>) => {
      if (state.currentSession) {
        const newMessage: ChatMessage = {
          ...action.payload,
          id: Date.now() + Math.random(),
          timestamp: Date.now()
        };
        state.currentSession.messages.push(newMessage);
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    updateUserData: (state, action: PayloadAction<ExtractedInfo>) => {
      if (state.currentSession) {
        state.currentSession.userData = action.payload;
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    setVerified: (state, action: PayloadAction<boolean>) => {
      if (state.currentSession) {
        state.currentSession.verified = action.payload;
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    startInterview: (state, action: PayloadAction<Question[]>) => {
      if (state.currentSession) {
        state.currentSession.interviewStarted = true;
        state.currentSession.questions = action.payload;
        state.currentSession.currentQuestionIndex = 0;
        state.currentSession.timeLeft = action.payload[0]?.timeLimit || null;
        state.currentSession.startedAt = Date.now();
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    updateQuestion: (state, action: PayloadAction<{ index: number; updates: Partial<Question> }>) => {
      const { index, updates } = action.payload;
      if (state.currentSession) {
        state.currentSession.questions[index] = {
          ...state.currentSession.questions[index],
          ...updates
        };
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    nextQuestion: (state) => {
      if (state.currentSession) {
        const nextIndex = state.currentSession.currentQuestionIndex + 1;
        state.currentSession.currentQuestionIndex = nextIndex;
        const nextQuestion = state.currentSession.questions[nextIndex];
        state.currentSession.timeLeft = nextQuestion?.timeLimit || null;
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    updateTimer: (state, action: PayloadAction<number>) => {
      if (state.currentSession) {
        state.currentSession.timeLeft = action.payload;
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    pauseInterview: (state) => {
      if (state.currentSession) {
        state.currentSession.isPaused = true;
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    resumeInterview: (state) => {
      if (state.currentSession) {
        state.currentSession.isPaused = false;
        state.currentSession.lastActiveAt = Date.now();
      }
    },

    completeInterview: (state, action: PayloadAction<{ score: number; summary: string }>) => {
      if (state.currentSession) {
        const completed = {
          ...state.currentSession,
          interviewCompleted: true,
          finalScore: action.payload.score,
          finalSummary: action.payload.summary,
          completedAt: Date.now(),
          lastActiveAt: Date.now()
        };
        state.completedSessions.push(completed);
        state.currentSession = null;
      }
    },

    clearCurrentSession: (state) => {
      state.currentSession = null;
    }
  }
});

export const {
  createNewSession,
  updateCurrentSession,
  addMessage,
  updateUserData,
  setVerified,
  startInterview,
  updateQuestion,
  nextQuestion,
  updateTimer,
  pauseInterview,
  resumeInterview,
  completeInterview,
  clearCurrentSession
} = interviewSlice.actions;

export default interviewSlice.reducer;
