import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare, MicIcon, Bot, User, Pause, Play } from "lucide-react";
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
import type { ExtractedInfo } from "@/store/types";

export default function Chat({ extracted }: { extracted: ExtractedInfo }) {
  const {
    currentSession,
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
    getCurrentQuestion,
  } = useInterviewStore();

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session if not exists
  useEffect(() => {
    if (!currentSession) {
      // This should not happen as session is created in upload component
      console.warn("No current session found in Chat component");
    }
  }, [currentSession]);

  // Handle verification completion
  useEffect(() => {
    if (currentSession?.verified && !currentSession.interviewStarted) {
      setShowStartDialog(true);
    }
  }, [currentSession?.verified, currentSession?.interviewStarted]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isLoading]);

  // Timer management
  useEffect(() => {
    if (
      !currentSession?.interviewStarted || 
      currentSession.isPaused ||
      currentSession.timeLeft === null ||
      currentSession.timeLeft === 0
    ) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Handle time up
    if (currentSession.timeLeft === 0) {
      handleAutoSubmit();
      return;
    }

    // Start/continue timer
    timerRef.current = setInterval(() => {
      const newTime = Math.max(0, (currentSession.timeLeft || 0) - 1);
      updateTimer(newTime);
      
      if (newTime === 0) {
        handleAutoSubmit();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    currentSession?.interviewStarted, 
    currentSession?.isPaused,
    currentSession?.timeLeft,
    currentSession?.currentQuestionIndex
  ]);

  // Start Interview Handler
  const handleStartInterview = async () => {
    setShowStartDialog(false);
    setIsLoading(true);

    addMessage({
      role: "assistant",
      content: "Great! Let's start the interview. You'll get 6 questions: 2 easy (20s each), 2 medium (60s each), and 2 hard (120s each).",
    });

    try {
      const res = await axios.post("http://localhost:5000/generate-questions", {
        role: "fullstack-react-node",
      });

      const aiQuestions = res.data.questions;
      startInterview(aiQuestions);

      addMessage({
        role: "assistant",
        content: aiQuestions[0].text,
      });
    } catch (err) {
      console.error("Error fetching AI questions", err);
      addMessage({
        role: "assistant", 
        content: "Sorry, there was an error generating questions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto Submit Answer
  const handleAutoSubmit = () => {
    if (!currentSession) return;

    const currentQ = getCurrentQuestion();
    if (!currentQ) return;

    const answer = transcript.trim() || "[No Answer]";
    const timeTaken = currentQ.timeLimit - (currentSession.timeLeft || 0);

    // Update current question with answer
    updateQuestion(currentSession.currentQuestionIndex, {
      answer,
      timeTaken,
    });

    // Add user message
    addMessage({
      role: "user",
      content: answer,
    });

    setTranscript("");

    // Check if more questions remain
    if (currentSession.currentQuestionIndex + 1 < currentSession.questions.length) {
      // Move to next question
      nextQuestion();
      const nextQ = currentSession.questions[currentSession.currentQuestionIndex + 1];
      
      addMessage({
        role: "assistant",
        content: nextQ.text,
      });
    } else {
      // Finish interview
      handleFinishInterview();
    }
  };

  const handleFinishInterview = async () => {
    if (!currentSession) return;

    setIsLoading(true);
    updateCurrentSession({ interviewStarted: false, timeLeft: null });

    try {
      const res = await axios.post("http://localhost:5000/score", {
        candidate: currentSession.userData,
        questions: currentSession.questions,
      });

      const { score, summary } = res.data;
      
      addMessage({
        role: "assistant",
        content: `🎉 Interview completed!\n\n**Final Score: ${score}/100**\n\n**Summary:** ${summary}`,
      });

      // Complete the interview and move to completed sessions
      completeInterview(score, summary);
      
    } catch (err) {
      console.error("Error scoring interview", err);
      addMessage({
        role: "assistant",
        content: "Interview completed! There was an error calculating your score, but your responses have been saved.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Submit (when user clicks submit or presses enter)
  const handleManualSubmit = () => {
    if (currentSession?.interviewStarted) {
      // Stop timer and submit answer
      handleAutoSubmit();
    } else {
      // Handle chat verification
      handleChatSubmit();
    }
  };

  const handleChatSubmit = async () => {
    if (!currentSession) return;
    
    const userMessage = transcript.trim();
    if (!userMessage) return;

    addMessage({
      role: "user",
      content: userMessage,
    });
    
    setTranscript("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/chat", {
        messages: [...currentSession.messages, { role: "user", content: userMessage }],
        extracted: currentSession.userData,
      });

      const { reply, state, verified } = response.data;
      
      updateUserData(state);
      addMessage({
        role: "assistant",
        content: reply,
      });
      
      if (verified) {
        setVerified(true);
      }
    } catch (err) {
      console.error("Chat error:", err);
      addMessage({
        role: "assistant",
        content: "Sorry, I'm having trouble processing your message. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Recording functions
  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser");
      // Fallback: focus on text input
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
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text + " ";
        } else {
          interim += text;
        }
      }
      
      setTranscript((prev) => prev + final || interim);
    };

    recognition.onend = () => setIsRecording(false);
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
      resumeInterview();
    } else {
      pauseInterview();
    }
  };

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No active session found.</p>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();
  const isInterviewActive = currentSession.interviewStarted && !currentSession.interviewCompleted;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto relative">
      {/* Candidate Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate Information</CardTitle>
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
                          <AvatarImage src="/ai-avatar.png" alt="AI" />
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
                          <AvatarImage src="/user-avatar.png" alt="User" />
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
                    <AvatarImage src="/ai-avatar.png" alt="AI" />
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
        <Alert className={`absolute top-2 right-2 p-2 text-sm ${
          currentSession.timeLeft <= 10 
            ? 'bg-red-50 border-red-300' 
            : 'bg-blue-50 border-blue-300'
        }`}>
          <AlertDescription>
            ⏳ Time left: {currentSession.timeLeft}s
            {currentQuestion && (
              <span className="ml-2 text-xs opacity-75">
                ({currentQuestion.level})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {currentSession.isPaused && (
        <Alert className="absolute top-2 right-2 bg-yellow-50 border-yellow-300 p-2 text-sm">
          <AlertDescription>⏸️ Interview Paused</AlertDescription>
        </Alert>
      )}

      {isRecording && (
        <Alert className="absolute top-12 right-2 bg-red-50 border-red-300 p-2 text-sm max-w-xs">
          <AlertDescription>
            🎙️ Recording...
            {transcript && (
              <div className="mt-1 text-xs opacity-75 truncate">
                "{transcript}"
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Input Area */}
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
                : currentSession.interviewCompleted
                ? "Interview completed!"
                : "Click Start Interview to begin"
            }
            disabled={
              (currentSession.verified && !isInterviewActive) || 
              currentSession.interviewCompleted ||
              currentSession.isPaused
            }
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputButton 
              onClick={toggleRecording}
              disabled={
                currentSession.interviewCompleted ||
                currentSession.isPaused
              }
              className={isRecording ? "bg-red-100 text-red-600" : ""}
            >
              <MicIcon size={16} />
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit 
            disabled={
              (currentSession.verified && !isInterviewActive) || 
              currentSession.interviewCompleted ||
              currentSession.isPaused ||
              !transcript.trim()
            }
          />
        </PromptInputToolbar>
      </PromptInput>

      {/* Status Messages */}
      {currentSession.verified && !isInterviewActive && !currentSession.interviewCompleted && (
        <Alert className="bg-green-100 border-green-400 text-green-800">
          <AlertDescription>✅ All details verified successfully! Ready to start interview.</AlertDescription>
        </Alert>
      )}

      {currentSession.interviewCompleted && (
        <Alert className="bg-blue-100 border-blue-400 text-blue-800">
          <AlertDescription>
            🎉 Interview completed! Final score: {currentSession.finalScore}/100
          </AlertDescription>
        </Alert>
      )}

      {/* Dialogs */}
      <StartInterviewDialog 
        open={showStartDialog} 
        onStart={handleStartInterview} 
      />
    </div>
  );
}