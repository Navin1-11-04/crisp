import { useState, useEffect } from "react"
import { AlertCircleIcon, PaperclipIcon, UploadIcon, XIcon, Loader2 } from "lucide-react"
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload"
import { Button } from "@/components/ui/button"
import axios from "axios"

export default function Component({ onExtracted }) {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const [extractedInfo, setExtractedInfo] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({ maxSize})

  const file = files[0]

  // Function to upload file to backend
  const uploadFileToBackend = async (file) => {
    setIsProcessing(true)
    setProcessingStatus("Uploading file...")
    
    try {
      console.log("Uploading file:", file.file.name, file.file.type, file.file.size)
      
      const formData = new FormData()
      formData.append("file", file.file)

      setProcessingStatus("Analyzing document...")

      const res = await axios.post("http://localhost:5000/extract", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000, // 2 minutes timeout for OCR processing
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setProcessingStatus(`Uploading file... ${percentCompleted}%`)
        }
      })
      
      console.log("Success response:", res.data)
      setExtractedInfo(res.data.extracted)
      onExtracted(res.data.extracted)
      setProcessingStatus("")
    } catch (err) {
      console.error("Error uploading file:", err)
      console.error("Error response:", err.response?.data)
      
      let errorMessage = "Failed to extract info"
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = "Processing timeout. Please try with a smaller file or clearer document."
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }
      
      // Handle different types of errors
      if (errorMessage.includes("scanned") || errorMessage.includes("No text found") || errorMessage.includes("OCR could not extract")) {
        setExtractedInfo({ 
          error: "This appears to be a scanned PDF or the text quality is too low for automatic extraction. Please manually enter your information below:",
          isScanned: true,
          name: "",
          email: "",
          phone: ""
        })
      } else {
        setExtractedInfo({ 
          error: errorMessage,
          name: "",
          email: "", 
          phone: ""
        })
      }
      setProcessingStatus("")
    } finally {
      setIsProcessing(false)
    }
  }

  // Call backend whenever a new file is uploaded
  useEffect(() => {
    if (file?.file) {
      uploadFileToBackend(file)
    } else {
      setExtractedInfo(null)
      setProcessingStatus("")
    }
  }, [file])

  return (
    <div className="flex-1 flex flex-col h-full w-full gap-2">
      {/* Drop area */}
      <div
        role="button"
        onClick={openFileDialog}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        className="flex-1 border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-colors has-disabled:pointer-events-none has-disabled:opacity-50 has-[input:focus]:ring-[3px]"
      >
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Upload file"
          disabled={Boolean(file) || isProcessing}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            {isProcessing ? (
              <Loader2 className="size-4 opacity-60 animate-spin" />
            ) : (
              <UploadIcon className="size-4 opacity-60" />
            )}
          </div>
          <p className="mb-1.5 text-sm font-medium">
            {isProcessing ? "Processing..." : "Upload file"}
          </p>
          <p className="text-muted-foreground text-xs">
            {isProcessing 
              ? processingStatus || "Analyzing document..."
              : `Drag & drop or click to browse (max. ${formatBytes(maxSize)})`
            }
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="text-destructive flex items-center gap-1 text-xs" role="alert">
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}

      {/* File list */}
      {file && (
        <div className="space-y-2 mt-2">
          <div key={file.id} className="flex items-center justify-between gap-2 rounded-xl border px-4 py-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <PaperclipIcon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{file.file.name}</p>
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground/80 hover:text-foreground -me-2 size-8 hover:bg-transparent"
              onClick={() => removeFile(file?.id)}
              aria-label="Remove file"
              disabled={isProcessing}
            >
              <XIcon className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="mt-2 p-4 border rounded-md bg-blue-50">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">
              {processingStatus || "Processing document... This may take up to 2 minutes for scanned PDFs."}
            </span>
          </div>
        </div>
      )}

      <p aria-live="polite" role="region" className="text-muted-foreground mt-2 text-center text-xs">
        Single file uploader w/ max size ∙{" "}
        <a href="https://github.com/origin-space/originui/tree/main/docs/use-file-upload.md" className="hover:text-foreground underline">
          API
        </a>
      </p>
    </div>
  )
}