import {
  Timeline,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/ui/timeline"

const steps = [
  {
    id: 1,
    title: "Upload Resume",
    desc: "Provide your resume in PDF or DOCX format.",
  },
  {
    id: 2,
    title: "Timed Questions",
    desc: "Answer 6 AI-generated questions with a countdown timer.",
  },
  {
    id: 3,
    title: "Score & Summary",
    desc: "Get your performance score and AI-generated feedback.",
  },
]

export default function TimeLineTree() {
  return (
    <Timeline defaultValue={1} className="w-full font-inter">
      {steps.map((step) => (
        <TimelineItem
          key={step.id}
          step={step.id}
          className="w-[calc(50%-1.5rem)] odd:ms-auto even:text-right even:group-data-[orientation=vertical]/timeline:ms-0 even:group-data-[orientation=vertical]/timeline:me-8 even:group-data-[orientation=vertical]/timeline:[&_[data-slot=timeline-indicator]]:-right-6 even:group-data-[orientation=vertical]/timeline:[&_[data-slot=timeline-indicator]]:left-auto even:group-data-[orientation=vertical]/timeline:[&_[data-slot=timeline-indicator]]:translate-x-1/2 even:group-data-[orientation=vertical]/timeline:[&_[data-slot=timeline-separator]]:-right-6 even:group-data-[orientation=vertical]/timeline:[&_[data-slot=timeline-separator]]:left-auto even:group-data-[orientation=vertical]/timeline:[&_[data-slot=timeline-separator]]:translate-x-1/2"
        >
          <TimelineHeader>
            <TimelineSeparator />
            <TimelineTitle>
              Step {step.id}: {step.title}
            </TimelineTitle>
            <TimelineIndicator />
          </TimelineHeader>
          <p className="text-sm text-muted-foreground mt-1">
            {step.desc}
          </p>
        </TimelineItem>
      ))}
    </Timeline>
  )
}
