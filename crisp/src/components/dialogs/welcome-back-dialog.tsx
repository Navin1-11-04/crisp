import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "@/components/ui/button"
import type { InterviewSession } from "@/store/types"
import { AlertTriangle, Clock, User } from "lucide-react"

type WelcomeBackDialogProps = {
  open: boolean
  session: InterviewSession
  onResume: () => void
  onStartNew: () => void
}

export function WelcomeBackDialog({ 
  open, 
  session, 
  onResume, 
  onStartNew 
}: WelcomeBackDialogProps) {
  const getSessionStatus = () => {
    if (!session.interviewStarted) {
      return {
        status: "Verification in progress",
        icon: <User className="w-5 h-5 text-blue-500" />,
        description: "You were in the middle of confirming your details."
      }
    }
    
    if (session.interviewStarted && !session.interviewCompleted) {
      const currentQ = session.currentQuestionIndex + 1
      const totalQ = session.questions.length
      return {
        status: `Interview in progress (${currentQ}/${totalQ})`,
        icon: <Clock className="w-5 h-5 text-orange-500" />,
        description: `You were answering question ${currentQ} of ${totalQ}.`
      }
    }
    
    return {
      status: "Session found",
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      description: "You have an unfinished session."
    }
  }

  const { status, icon, description } = getSessionStatus()
  const timeSinceLastActivity = Date.now() - session.lastActiveAt
  const hoursAgo = Math.floor(timeSinceLastActivity / (1000 * 60 * 60))
  const minutesAgo = Math.floor((timeSinceLastActivity % (1000 * 60 * 60)) / (1000 * 60))
  
  const timeAgoText = hoursAgo > 0 
    ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
    : `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            Welcome Back!
          </DialogTitle>
          <DialogDescription asChild>
  <div className="space-y-3">
    <div>
      <p className="font-medium text-foreground">{status}</p>
      <p className="text-sm">{description}</p>
    </div>

    <div className="bg-muted p-3 rounded-md space-y-1">
      <div className="text-sm">
        <strong>Candidate:</strong> {session.userData.name || "Unknown"}
      </div>
      <div className="text-sm">
        <strong>Last activity:</strong> {timeAgoText}
      </div>
      {session.interviewStarted && (
        <div className="text-sm">
          <strong>Progress:</strong> {session.currentQuestionIndex}/{session.questions.length} questions
        </div>
      )}
    </div>

    <p className="text-xs text-muted-foreground">
      You can resume where you left off or start a completely new interview.
    </p>
  </div>
</DialogDescription>

        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button 
            variant="outline" 
            onClick={onStartNew}
            className="w-full sm:w-auto"
          >
            Start New Interview
          </Button>
          <Button 
            onClick={onResume}
            className="w-full sm:w-auto"
          >
            Resume Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}