import ThemeToggle from "@/components/theme-toggle"
import { Bubbles } from "lucide-react"


export const Header = () => {

  return (
    <header className="w-full h-auto text-primary flex items-center justify-between px-4 md:px-6 py-1.5 font-poppins">
        <div className="group/hover flex-1 flex items-center gap-1 hover:text-primary/50 transition-all duration-300">
            <Bubbles className="w-4 h-4" strokeWidth={2.3}/>
            <a href="/" className="font-medium tracking-tight text-base leading-0">
              crisp
            </a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
    </header>
  )
}
