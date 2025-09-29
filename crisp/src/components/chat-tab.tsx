import { useState, useEffect } from "react";
import Upload from "./upload";
import Chat from "./chat";
import { WelcomeBackDialog } from "./dialogs/welcome-back-dialog";

export const ChatTab = () => {
  const { 
    currentSession,
    hasUnfinishedSession,
    isSessionExpired,
    createNewSession,
    clearCurrentSession
  } = useInterviewStore();
  
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Check for existing session on component mount
  useEffect(() => {
    if (hasUnfinishedSession() && !isSessionExpired()) {
      setShowWelcomeBack(true);
    } else if (hasUnfinishedSession() && isSessionExpired()) {
      // Clear expired session
      clearCurrentSession();
    }
  }, []);

  const handleExtracted = (info: any) => {
    setExtractedInfo(info);
    createNewSession(info);
  };

  const handleResumeSession = () => {
    setShowWelcomeBack(false);
    // Session is already loaded, just hide the dialog
  };

  const handleStartNewSession = () => {
    setShowWelcomeBack(false);
    clearCurrentSession();
    setExtractedInfo(null);
  };
  
  return (
    <div className="flex-1 flex flex-col h-full w-full px-4 py-2 md:px-6 md:py-4">
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
  )
}