import { ArrowRight } from "lucide-react";
import TimeLineTree from "./interview-timeline";
import { Button } from "./ui/button";

export const InterviewOnboard = ({ onContinue }: { onContinue: () => void }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-between w-full h-full rounded-lg py-6 px-4 gap-y-6">         
            <div>
             <h1 className="text-xl font-medium text-foreground text-center">Welcome to Crisp</h1>
                <p className="text-base text-muted-foreground text-center">
                    Complete your AI-powered interview by following the steps.
                </p>
            </div>
            <TimeLineTree />
            <div className="w-full flex items-center justify-center">
            <Button size="lg"
             onClick={onContinue} 
             className="gap-2 w-fit rounded-full">
            Start the Interview <ArrowRight className="w-5 h-5" />
            </Button>
            </div>
    </div>
  );
};
