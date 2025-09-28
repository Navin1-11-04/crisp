import ThemeToggle from "@/components/theme-toggle"


export default function Header() {

  return (
    <header className="px-4 md:px-6">
      <div className="flex h-12 items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
            <a href="#" className="text-primary hover:text-primary/90 font-semibold tracking-tight text-lg">
              crisp
            </a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
