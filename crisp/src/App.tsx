import './App.css'
import Header from './components/header'
import TabsArea from './components/tabs-area'


function App() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8f8f7]">
      <Header/>
      <main className='flex-1 flex flex-col h-full w-full bg-background'>
         <TabsArea/>
      </main>
      <div className="">
        this is the footer
      </div>
    </div>
  )
}

export default App
