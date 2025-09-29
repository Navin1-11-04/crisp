import './App.css'
import { Header } from './components/header'
import TabsArea from './components/tabs-area'


function App() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-background">
      <Header/>
      <main className="flex-1 flex flex-col h-full w-full px-4 md:px-6 py-1 md:py-2 gap-y-2">
        <div className='font-poppins'>
          <h1 className='font-semibold text-xl'>AI - Interview Assistant</h1>
          <p className='text-xs text-muted-foreground font-normal'>From resume to Results in Minutes.</p>
        </div>
        <TabsArea/>
      </main>
      {/* <main className='flex-1 flex flex-col h-full w-full bg-neutral-200 rounded-xl px-6 py-4'>
        <h1>AI - Interview Assistant</h1>
         <TabsArea/>
      </main> */}
    </div>
  )
}

export default App
