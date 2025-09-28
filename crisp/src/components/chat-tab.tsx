import { useState } from "react";
import Upload from "./upload";
import Chat from "./chat";

export const ChatTab = () => {
  const [extractedInfo, setExtractedInfo] = useState(null);
  
  return (
    <div className="flex-1 flex flex-col h-full w-full px-4 py-2 md:px-6 md:py-4">
      {!extractedInfo ? (
        <Upload onExtracted={setExtractedInfo} />
      ) : (
        <Chat extracted={extractedInfo} />
      )}
    </div>
  )
}
