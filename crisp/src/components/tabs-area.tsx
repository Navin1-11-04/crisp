import {
  LayoutDashboard,
  MessageCircle,
  SettingsIcon,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ChatTab } from "./chat-tab"

export default function TabsArea() {
  return (
    <Tabs defaultValue="chat" className="flex-1 flex flex-col w-full h-full bg-background">
      <TabsList className="h-auto gap-2 rounded-none border-b bg-transparent py-1 w-full">
        <TabsTrigger
          value="chat"
          className="group text-muted-foreground hover:bg-accent hover:text-foreground 
                     data-[state=active]:text-foreground 
                     data-[state=active]:after:bg-primary 
                     relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 
                     data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center"
        >
          <MessageCircle className="-ms-0.5 me-1.5 opacity-60" size={16} />
          Interviewee
          <Badge
            className="ms-1.5 pb-0.5 bg-muted-foreground 
                       group-data-[state=active]:bg-primary transition-colors"
          >
            Chat
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="dashboard"
          className="group text-muted-foreground hover:bg-accent hover:text-foreground 
                     data-[state=active]:text-foreground 
                     data-[state=active]:after:bg-primary 
                     relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 
                     data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center"
        >
          <LayoutDashboard className="-ms-0.5 me-1.5 opacity-60" size={16} />
          Interviewer
          <Badge
            className="ms-1.5 pb-0.5 bg-muted-foreground 
                       group-data-[state=active]:bg-primary transition-colors"
          >
            Dashboard
          </Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="chat" className="flex-1 flex flex-col w-full h-full py-2">
        <ChatTab/>
      </TabsContent>
      <TabsContent value="dashboard" className="flex-1 flex flex-col h-full w-full">
        <p className="text-muted-foreground pt-1 text-center text-xs">
          Content for Tab 2
        </p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-muted-foreground pt-1 text-center text-xs">
          Content for Tab 6
        </p>
      </TabsContent>
    </Tabs>
  )
}
