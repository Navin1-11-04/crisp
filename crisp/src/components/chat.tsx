import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare, MicIcon, Bot, User, Pause, Play, Home, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "./ai-elements/conversation";
import { Message, MessageContent } from "./ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./ai-elements/prompt-input";
import { StartInterviewDialog } from "./dialogs/interview-dialog";
import { CompletionDialog } from "./dialogs/completion-dialog";
import type { ExtractedInfo } from "@/store/types";
import type { RootState } from "@/store";
import {
  addMessage,
  updateUserData,
  setVerified,
  startInterview,
  updateQuestion,
  nextQuestion,
  updateTimer,
  completeInterview,
  clearCurrentSession,
} from "@/store/interviewSlice";

export default function Chat({ extracted }: { extracted: ExtractedInfo }) {
  const dispatch = useDispatch();
  const currentSession = useSelector((state: RootState) => state.interview.currentSession);

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle verification completion
  useEffect(() => {
    if (currentSession?.verified && !currentSession.interviewStarted) {
      setShowStartDialog(true);
    }
  }, [currentSession?.verified, currentSession?.interviewStarted]);

  // Show completion dialog when interview is done
  useEffect(() => {
    if (currentSession?.interviewCompleted && currentSession.finalScore !== undefined) {
      setShowCompletionDialog(true);
    }
  }, [currentSession?.interviewCompleted, currentSession?.finalScore]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isLoading]);

  // Timer management
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      !currentSession?.interviewStarted || 
      currentSession.interviewCompleted ||
      currentSession.timeLeft === null
    ) {
      return;
    }

    if (currentSession.timeLeft === 0) {
      handleAutoSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      const currentTime = currentSession.timeLeft || 0;
      if (currentTime <= 1) {
        dispatch(updateTimer(0));
      } else {
        dispatch(updateTimer(currentTime - 1));
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentSession?.interviewStarted, currentSession?.timeLeft]);

  const handleStartInterview = async () => {
    setShowStartDialog(false);
    setIsLoading(true);

    dispatch(addMessage({
      role: "assistant",
      content: "Great! Let's start the interview. You'll get 6 questions: 2 easy (20s each), 2 medium (60s each), and 2 hard (120s each).",
    }));

    try {
      const res = await axios.post("http://localhost:5000/generate-questions", {
        role: "fullstack-react-node",
      });

      const aiQuestions = res.data.questions;
      dispatch(startInterview(aiQuestions));

      dispatch(addMessage({
        role: "assistant",
        content: `**Question 1 of 6** (${aiQuestions[0].level})\n\n${aiQuestions[0].text}`,
      }));
    } catch (err) {
      console.error("Error fetching AI questions", err);
      dispatch(addMessage({
        role: "assistant", 
        content: "Sorry, there was an error generating questions. Please try again.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSubmit = () => {
    if (!currentSession) return;

    const currentQ = currentSession.questions[currentSession.currentQuestionIndex];
    if (!currentQ) return;

    const answer = transcript.trim() || "[No Answer - Time Expired]";
    const timeTaken = currentQ.timeLimit - (currentSession.timeLeft || 0);

    dispatch(updateQuestion({
      index: currentSession.currentQuestionIndex,
      updates: { answer, timeTaken }
    }));

    dispatch(addMessage({
      role: "user",
      content: answer,
    }));

    setTranscript("");

    const isLastQuestion = currentSession.currentQuestionIndex + 1 >= currentSession.questions.length;
    
    if (!isLastQuestion) {
      const nextIndex = currentSession.currentQuestionIndex + 1;
      dispatch(nextQuestion());
      
      const nextQ = currentSession.questions[nextIndex];
      
      setTimeout(() => {
        dispatch(addMessage({
          role: "assistant",
          content: `**Question ${nextIndex + 1} of 6** (${nextQ.level})\n\n${nextQ.text}`,
        }));
      }, 500);
    } else {
      handleFinishInterview();
    }
  };

  const handleFinishInterview = async () => {
    if (!currentSession) return;

    setIsLoading(true);

    dispatch(addMessage({
      role: "assistant",
      content: "⏳ Calculating your final score...",
    }));

    try {
      const res = await axios.post("http://localhost:5000/score", {
        candidate: currentSession.userData,
        questions: currentSession.questions,
      });

      const { score, summary } = res.data;
      
      dispatch(addMessage({
        role: "assistant",
        content: `🎉 **Interview Completed!**\n\n**Final Score: ${score}/100**\n\n**Summary:** ${summary}\n\nThank you for participating!`,
      }));

      // Mark interview as completed (but don't move to completedSessions yet)
      dispatch(completeInterview({ score, summary }));
      
    } catch (err) {
      console.error("Error scoring interview", err);
      
      const answeredQuestions = currentSession.questions.filter(q => q.answer && !q.answer.includes("No Answer")).length;
      const fallbackScore = Math.round((answeredQuestions / currentSession.questions.length) * 70 + 20);
      
      dispatch(addMessage({
        role: "assistant",
        content: `🎉 **Interview Completed!**\n\n**Final Score: ${fallbackScore}/100**\n\nYour responses have been saved. Thank you for participating!`,
      }));

      dispatch(completeInterview({ 
        score: fallbackScore, 
        summary: `Completed ${answeredQuestions} out of ${currentSession.questions.length} questions.` 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!transcript.trim()) return;

    if (currentSession?.interviewStarted && !currentSession.interviewCompleted) {
      handleAutoSubmit();
    } else if (!currentSession?.verified) {
      handleChatSubmit();
    }
  };

  const handleChatSubmit = async () => {
    if (!currentSession) return;
    
    const userMessage = transcript.trim();
    if (!userMessage) return;

    dispatch(addMessage({
      role: "user",
      content: userMessage,
    }));
    
    setTranscript("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/chat", {
        messages: [...currentSession.messages, { role: "user", content: userMessage }],
        extracted: currentSession.userData,
      });

      const { reply, state, verified } = response.data;
      
      dispatch(updateUserData(state));
      dispatch(addMessage({
        role: "assistant",
        content: reply,
      }));
      
      if (verified) {
        dispatch(setVerified(true));
      }
    } catch (err) {
      console.error("Chat error:", err);
      dispatch(addMessage({
        role: "assistant",
        content: "Sorry, I'm having trouble processing your message. Please try again.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser");
      const textarea = document.querySelector('textarea[placeholder*="answer"]') as HTMLTextAreaElement;
      if (textarea) textarea.focus();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }
      
      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      } else if (interimTranscript) {
        setTranscript((prev) => {
          const withoutInterim = prev.split('[interim]')[0] || prev;
          return withoutInterim + '[interim]' + interimTranscript;
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setTranscript(prev => prev.split('[interim]')[0] || prev);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handlePauseResume = () => {
    if (!currentSession) return;
    
    if (currentSession.isPaused) {
      dispatch(resumeInterview());
    } else {
      dispatch(pauseInterview());
    }
  };

  const handleStartNewInterview = () => {
    setShowCompletionDialog(false);
    dispatch(clearCurrentSession());
  };

  const handleViewDashboard = () => {
    setShowCompletionDialog(false);
    // TODO: Switch to dashboard tab
    // You'll need to implement tab switching logic
  };

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No active session found.</p>
      </div>
    );
  }

  const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex];
  const isInterviewActive = currentSession.interviewStarted && !currentSession.interviewCompleted;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto relative">
      {/* Candidate Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Candidate Information</CardTitle>
          {currentSession.interviewCompleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartNewInterview}
            >
              <Home className="w-4 h-4 mr-2" />
              New Interview
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <strong>Name:</strong> {currentSession.userData.name}
          </div>
          <div>
            <strong>Email:</strong> {currentSession.userData.email}
          </div>
          <div>
            <strong>Phone:</strong> {currentSession.userData.phone}
          </div>
          {isInterviewActive && (
            <div className="pt-2 border-t">
              <strong>Progress:</strong> {currentSession.currentQuestionIndex + 1}/{currentSession.questions.length} questions
            </div>
          )}
          {currentSession.interviewCompleted && currentSession.finalScore !== undefined && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <strong>Final Score:</strong> 
                <span className={`font-bold ${
                  currentSession.finalScore >= 86 ? 'text-green-600' :
                  currentSession.finalScore >= 76 ? 'text-blue-600' :
                  currentSession.finalScore >= 61 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {currentSession.finalScore}/100
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="flex flex-col h-[500px] overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Interview Chat
            {isInterviewActive && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePauseResume}
                className="ml-auto"
              >
                {currentSession.isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </>
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4">
          <Conversation>
            <ConversationContent>
              {currentSession.messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<MessageSquare className="size-12" />}
                  title="No messages yet"
                  description="Start a conversation to see messages here"
                />
              ) : (
                <div className="space-y-4">
                  {currentSession.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {m.role === "assistant" && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-blue-100">
                            <Bot size={16} className="text-blue-600" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <Message from={m.role}>
                        <MessageContent
                          variant={m.role === "assistant" ? "flat" : undefined}
                          className={`px-4 py-2.5 max-w-[75%] break-words ${
                            m.role === "assistant" 
                              ? "bg-gray-100 text-gray-900" 
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {m.content}
                          </div>
                        </MessageContent>
                      </Message>

                      {m.role === "user" && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-blue-600">
                            <User size={16} className="text-white" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex gap-3 justify-start mt-4">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-blue-100">
                      <Bot size={16} className="text-blue-600" />
                    </AvatarFallback>
                  </Avatar>
                  <Message from="assistant">
                    <MessageContent variant="flat" className="px-4 py-2.5 bg-gray-100 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-700">Processing...</span>
                    </MessageContent>
                  </Message>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {isInterviewActive && currentSession.timeLeft !== null && !currentSession.isPaused && (
        <Alert className={`absolute top-2 right-2 p-2 text-sm shadow-lg ${
          currentSession.timeLeft <= 10 
            ? 'bg-red-50 border-red-400 animate-pulse' 
            : 'bg-blue-50 border-blue-300'
        }`}>
          <AlertDescription className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <span className="font-semibold">Time: {currentSession.timeLeft}s</span>
            {currentQuestion && (
              <span className="text-xs opacity-75 ml-1">
                ({currentQuestion.level})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {currentSession.isPaused && (
        <Alert className="absolute top-2 right-2 bg-yellow-50 border-yellow-300 p-2 text-sm shadow-lg">
          <AlertDescription>⏸️ Interview Paused</AlertDescription>
        </Alert>
      )}

      {isRecording && (
        <Alert className="absolute top-12 right-2 bg-red-50 border-red-300 p-2 text-sm max-w-xs shadow-lg">
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span className="animate-pulse">🎙️</span>
              <span>Recording...</span>
            </div>
            {transcript && !transcript.includes('[interim]') && (
              <div className="mt-1 text-xs opacity-75 line-clamp-2">
                "{transcript}"
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Input Area */}
      {!currentSession.interviewCompleted && (
        <PromptInput
          onSubmit={handleManualSubmit}
          className="border rounded-lg bg-background"
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={
                !currentSession.verified
                  ? "Confirm or correct your details..."
                  : isInterviewActive && !currentSession.isPaused
                  ? `Type your answer... (${currentSession.timeLeft || 0}s left)`
                  : "Click Start Interview to begin"
              }
              disabled={
                (currentSession.verified && !isInterviewActive) || 
                currentSession.isPaused
              }
              value={transcript.split('[interim]')[0] || transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton 
                onClick={toggleRecording}
                disabled={
                  currentSession.isPaused ||
                  (!currentSession.verified && currentSession.verified !== undefined)
                }
                className={isRecording ? "bg-red-100 text-red-600" : ""}
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                <MicIcon size={16} />
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit 
              disabled={
                (currentSession.verified && !isInterviewActive) || 
                currentSession.isPaused ||
                !transcript.trim()
              }
            />
          </PromptInputToolbar>
        </PromptInput>
      )}

      {/* Status Messages */}
      {currentSession.verified && !isInterviewActive && !currentSession.interviewCompleted && (
        <Alert className="bg-green-50 border-green-400">
          <AlertDescription className="text-green-800 flex items-center gap-2">
            <span>✅</span>
            <span>All details verified! Ready to start the interview.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Dialogs */}
      <StartInterviewDialog 
        open={showStartDialog} 
        onStart={handleStartInterview} 
      />

      {currentSession.interviewCompleted && (
        <CompletionDialog
          open={showCompletionDialog}
          score={currentSession.finalScore || 0}
          summary={currentSession.finalSummary || ""}
          candidateName={currentSession.userData.name}
          onStartNew={handleStartNewInterview}
          onViewDashboard={handleViewDashboard}
        />
      )}
    </div>
  );
}