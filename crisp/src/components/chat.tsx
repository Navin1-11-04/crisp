import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare, MicIcon, Bot, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

type ExtractedInfo = { name: string; email: string; phone: string };
type ChatMessage = { id: number; role: "assistant" | "user"; content: string };
type Question = {
  id: number;
  text: string;
  level: "easy" | "medium" | "hard";
  timeLimit: number;
  answer?: string;
  timeTaken?: number;
};

export default function Chat({ extracted }: { extracted: ExtractedInfo }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi! I've extracted some details from your resume. Can you help me confirm or fill in the missing info?",
    },
  ]);
  const [userData, setUserData] = useState<ExtractedInfo>(extracted);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (verified) setShowStartDialog(true);
  }, [verified]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!interviewStarted || timeLeft === null) return;
    if (timeLeft === 0) {
      autoSubmit();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => (prev ? prev - 1 : 0)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, interviewStarted]);

  // === Start Interview ===
  const handleStartInterview = async () => {
    setShowStartDialog(false);
    setInterviewStarted(true);
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "assistant",
        content: "Great, let's start the interview. You'll get 6 questions (2 easy, 2 medium, 2 hard).",
      },
    ]);

    try {
      const res = await axios.post("http://localhost:5000/generate-questions", {
        role: "fullstack-react-node",
      });

      const aiQuestions: Question[] = res.data.questions;
      setQuestions(aiQuestions);
      setCurrentIndex(0);
      setTimeLeft(aiQuestions[0].timeLimit);

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: aiQuestions[0].text },
      ]);
    } catch (err) {
      console.error("Error fetching AI questions", err);
    } finally {
      setIsLoading(false);
    }
  };

  // === Auto Submit Answer ===
  const autoSubmit = () => {
    const currentQ = questions[currentIndex];
    const answer = transcript.trim() || "[No Answer]";

    const updatedQuestions = [...questions];
    updatedQuestions[currentIndex] = {
      ...currentQ,
      answer,
      timeTaken: currentQ.timeLimit - (timeLeft || 0),
    };
    setQuestions(updatedQuestions);

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: answer }]);
    setTranscript("");

    if (currentIndex + 1 < updatedQuestions.length) {
      const nextQ = updatedQuestions[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(nextQ.timeLimit);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: nextQ.text }]);
    } else {
      finishInterview(updatedQuestions);
    }
  };

  const finishInterview = async (finalQuestions: Question[]) => {
    setInterviewStarted(false);
    setTimeLeft(null);
    setIsLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/score", {
        candidate: userData,
        questions: finalQuestions,
      });

      const { score, summary } = res.data;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: `✅ Interview completed!\n\nFinal Score: ${score}\nSummary: ${summary}`,
        },
      ]);
    } catch (err) {
      console.error("Error scoring interview", err);
    } finally {
      setIsLoading(false);
    }
  };

  // === Recording ===
  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
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
        if (event.results[i].isFinal) final += text + " ";
        else interim += text;
      }
      setTranscript(final || interim);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

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
    if (isRecording) stopRecording();
    else startRecording();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto relative">
      {/* Extracted details */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <strong>Name:</strong> {userData.name}
          </div>
          <div>
            <strong>Email:</strong> {userData.email}
          </div>
          <div>
            <strong>Phone:</strong> {userData.phone}
          </div>
        </CardContent>
      </Card>

      {/* Chat */}
      <Card className="flex flex-col h-[500px] overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          <Conversation>
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<MessageSquare className="size-12" />}
                  title="No messages yet"
                  description="Start a conversation to see messages here"
                />
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
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
                      <span className="text-sm text-gray-700">Thinking...</span>
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

      {interviewStarted && timeLeft !== null && (
        <Alert className="absolute top-2 right-2 bg-blue-50 border-blue-300 p-1 text-sm">
          <AlertDescription>⏳ Time left: {timeLeft}s</AlertDescription>
        </Alert>
      )}
      {isRecording && (
        <Alert className="absolute top-12 right-2 bg-red-50 border-red-300 p-1 text-sm">
          <AlertDescription>🎙️ Recording... {transcript}</AlertDescription>
        </Alert>
      )}

      {/* Input */}
      <PromptInput
        onSubmit={() => {
          if (interviewStarted) {
            autoSubmit();
          } else {
            const userMessage = transcript.trim();
            if (!userMessage) return;

            setMessages((prev) => [
              ...prev,
              { id: Date.now(), role: "user", content: userMessage },
            ]);
            setTranscript("");
            setIsLoading(true);

            axios
              .post("http://localhost:5000/chat", {
                messages: messages.concat({ id: Date.now(), role: "user", content: userMessage }),
                extracted: userData,
              })
              .then((res) => {
                const { reply, state, verified: isVerified } = res.data;
                setUserData(state);
                setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: reply }]);
                if (isVerified) setVerified(true);
              })
              .catch((err) => {
                console.error("Chat error:", err);
              })
              .finally(() => {
                setIsLoading(false);
              });
          }
        }}
        className="border rounded-lg bg-background"
      >
        <PromptInputBody>
          <PromptInputTextarea
            placeholder={
              !verified
                ? "Confirm or correct your details..."
                : interviewStarted
                ? `Type your answer... (${timeLeft}s left)`
                : "Click Start Interview to begin"
            }
            disabled={verified && !interviewStarted}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputButton onClick={toggleRecording}>
              <MicIcon size={16} />
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit disabled={verified && !interviewStarted} />
        </PromptInputToolbar>
      </PromptInput>

      {/* Verified Alert */}
      {verified && !interviewStarted && (
        <Alert className="bg-green-100 border-green-400 text-green-800">
          <AlertDescription>✅ All details verified successfully!</AlertDescription>
        </Alert>
      )}

      <StartInterviewDialog open={showStartDialog} onStart={handleStartInterview} />
    </div>
  );
}