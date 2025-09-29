import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, TrendingUp, FileText, Home, LayoutDashboard } from "lucide-react"
import { Progress } from "@/components/ui/progress"

type CompletionDialogProps = {
  open: boolean
  score: number
  summary: string
  candidateName: string
  onStartNew: () => void
  onViewDashboard: () => void
}

export function CompletionDialog({ 
  open, 
  score, 
  summary,
  candidateName,
  onStartNew,
  onViewDashboard
}: CompletionDialogProps) {
  
  const getScoreGrade = (score: number) => {
    if (score >= 86) return { grade: "Excellent", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" }
    if (score >= 76) return { grade: "Good", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" }
    if (score >= 61) return { grade: "Average", color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" }
    return { grade: "Needs Improvement", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" }
  }

  const { grade, color, bgColor, borderColor } = getScoreGrade(score)

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={`rounded-full p-3 ${bgColor}`}>
              <CheckCircle2 className={`w-12 h-12 ${color}`} />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Interview Completed! 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            Great job, <span className="font-semibold">{candidateName}</span>! 
            Here's your performance summary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Score Display */}
          <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-6 text-center`}>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Final Score
            </div>
            <div className={`text-4xl font-bold ${color} mb-2`}>
              {score}<span className="text-2xl">/100</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className={`w-4 h-4 ${color}`} />
              <span className={`text-sm font-semibold ${color}`}>{grade}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <Progress value={score} className="h-2" />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">AI Summary</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </div>

          {/* Performance Breakdown */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border bg-background p-3">
              <div className="text-2xl font-bold text-foreground">6</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-2xl font-bold text-foreground">{score}%</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className={`text-2xl font-bold ${color}`}>{grade.split(' ')[0]}</div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={onViewDashboard}
            className="w-full"
            variant="default"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            View Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={onStartNew}
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Start New Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}