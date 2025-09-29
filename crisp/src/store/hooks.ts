// store/hooks.ts
import { useDispatch, useSelector } from "react-redux";
import type {TypedUseSelectorHook} from "react-redux"
// adjust path if needed
import {
  createNewSession,
  updateCurrentSession,
  addMessage,
  updateUserData,
  setVerified,
  startInterview,
  updateQuestion,
  nextQuestion,
  updateTimer,
  completeInterview,
  clearCurrentSession,
} from "./interviewSlice";
import type { AppDispatch, RootState } from ".";

// Typed hooks for Redux
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hook
export const useInterviewStore = () => {
  const state = useAppSelector((state) => state.interview);
  const dispatch = useAppDispatch();

  // Helper functions
  const hasUnfinishedSession = () =>
    !!state.currentSession && !state.currentSession.interviewCompleted;

  const isSessionExpired = () =>
    !!state.currentSession &&
    Date.now() - (state.currentSession.lastActiveAt || 0) > 24 * 60 * 60 * 1000; // 24h timeout

  const getCurrentQuestion = () =>
    state.currentSession?.questions[state.currentSession.currentQuestionIndex] || null;

  return {
    // state
    currentSession: state.currentSession,
    completedSessions: state.completedSessions,

    // helpers
    hasUnfinishedSession,
    isSessionExpired,
    getCurrentQuestion,

    // actions
    createNewSession: (info: any) => dispatch(createNewSession(info)),
    updateCurrentSession: (updates: any) => dispatch(updateCurrentSession(updates)),
    addMessage: (msg: any) => dispatch(addMessage(msg)),
    updateUserData: (data: any) => dispatch(updateUserData(data)),
    setVerified: (v: boolean) => dispatch(setVerified(v)),
    startInterview: (questions: any) => dispatch(startInterview(questions)),
    updateQuestion: (payload: any) => dispatch(updateQuestion(payload)),
    nextQuestion: () => dispatch(nextQuestion()),
    updateTimer: (time: number) => dispatch(updateTimer(time)),
    pauseInterview: () => dispatch(pauseInterview()),
    resumeInterview: () => dispatch(resumeInterview()),
    completeInterview: (payload: any) => dispatch(completeInterview(payload)),
    clearCurrentSession: () => dispatch(clearCurrentSession()),
  };
};
