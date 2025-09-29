import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "@/components/ui/button"

type StartInterviewDialogProps = {
  open: boolean
  onStart: () => void
}

export function StartInterviewDialog({ open, onStart }: StartInterviewDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Interview Starting 🚀</DialogTitle>
          <DialogDescription>
            You will be asked 6 questions in total:
            <br />
            <span className="font-medium">2 Easy (20s each)</span>,{" "}
            <span className="font-medium">2 Medium (60s each)</span>,{" "}
            <span className="font-medium">2 Hard (120s each)</span>.
            <br />
            Answer within the time limit. Your performance will be scored at the end.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onStart} className="w-full">
            Start Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
