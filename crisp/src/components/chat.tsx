import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, SendHorizonal } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import axios from "axios"
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "./ai-elements/conversation"

  // <--- import the file you pasted

type ExtractedInfo = {
  name: string
  email: string
  phone: string
}

export default function Chat({ extracted }: { extracted: ExtractedInfo }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I’ve extracted some details from your resume. Can you help me confirm or fill in the missing info?" }
  ])
  const [userData, setUserData] = useState<ExtractedInfo>(extracted)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [verified, setVerified] = useState(false)

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return

    const newMessages = [...messages, { role: "user", content: input }]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    try {
      const res = await axios.post("http://localhost:5000/chat", {
        messages: newMessages,
        extracted: userData,
      })

      const { reply, state } = res.data
      setUserData(state)
      setMessages([...newMessages, { role: "assistant", content: reply }])

      if (state.name !== "Not Found" && state.email !== "Not Found" && state.phone !== "Not Found") {
        setVerified(true)
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "⚠️ Error getting response" }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {/* Extracted details */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div><strong>Name:</strong> {userData.name}</div>
          <div><strong>Email:</strong> {userData.email}</div>
          <div><strong>Phone:</strong> {userData.phone}</div>
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="relative flex flex-col h-[400px]">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="No messages yet"
                description="Start chatting to confirm your details"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-md text-sm max-w-[80%] ${
                      m.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-muted"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-3 w-3 animate-spin" /> Bot is typing...
                  </div>
                )}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input box */}
        <form onSubmit={sendMessage} className="flex gap-2 border-t p-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </Button>
        </form>
      </Card>

      {verified && (
        <Alert className="bg-green-100 border-green-400 text-green-800">
          <AlertDescription>✅ All details verified successfully!</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
