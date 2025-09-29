import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Upload from "./upload";
import Chat from "./chat";
import { WelcomeBackDialog } from "./dialogs/welcome-back-dialog";
import { InterviewOnboard } from "./interview-onboard";
import type { RootState } from "@/store";
import { createNewSession, clearCurrentSession } from "@/store/interviewSlice";

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

export const ChatTab = () => {
  const dispatch = useDispatch();
  const currentSession = useSelector((state: RootState) => state.interview.currentSession);

  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showOnboard, setShowOnboard] = useState(!currentSession); // show onboarding only if no active session

  useEffect(() => {
    if (currentSession && !currentSession.interviewCompleted) {
      const timeSinceLastActive = Date.now() - currentSession.lastActiveAt;
      const isExpired = timeSinceLastActive > SESSION_TIMEOUT;

      if (isExpired) {
        dispatch(clearCurrentSession());
      } else {
        setShowWelcomeBack(true);
      }
    }
  }, []);

  const handleExtracted = (info: any) => {
    dispatch(createNewSession(info));
  };

  const handleResumeSession = () => {
    setShowWelcomeBack(false);
  };

  const handleStartNewSession = () => {
    setShowWelcomeBack(false);
    setShowOnboard(true); // go back to onboarding
    dispatch(clearCurrentSession());
  };

  if (showOnboard) {
    return <InterviewOnboard onContinue={() => setShowOnboard(false)} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {!currentSession ? (
        <Upload onExtracted={handleExtracted} />
      ) : (
        <Chat extracted={currentSession.extractedInfo} />
      )}

      {showWelcomeBack && currentSession && (
        <WelcomeBackDialog
          open={showWelcomeBack}
          session={currentSession}
          onResume={handleResumeSession}
          onStartNew={handleStartNewSession}
        />
      )}
    </div>
  );
};
