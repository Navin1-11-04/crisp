import { useState, useEffect } from "react"
import { AlertCircleIcon, PaperclipIcon, UploadIcon, XIcon } from "lucide-react"
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload"
import { Button } from "@/components/ui/button"
import axios from "axios"

// const initialFiles = [
//   {
//     name: "document.pdf",
//     size: 1528737,
//     type: "application/pdf",
//     url: "https://picsum.photos/1000/800?grayscale&random=1",
//     id: "document.pdf-1744638436563-8u5xuls",
//   },
// ]

export default function Component() {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const [extractedInfo, setExtractedInfo] = useState(null)

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
    try {
      const formData = new FormData()
      formData.append("file", file.file) // Multer expects "file" key

      const res = await axios.post("http://localhost:5000/extract", formData)
      setExtractedInfo(res.data.extracted)
    } catch (err) {
      console.error("Error uploading file:", err)
      setExtractedInfo({ error: "Failed to extract info" })
    }
  }

  // Call backend whenever a new file is uploaded
  useEffect(() => {
    if (file?.file) {
      uploadFileToBackend(file)
    } else {
      setExtractedInfo(null)
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
          disabled={Boolean(file)}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            <UploadIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 text-sm font-medium">Upload file</p>
          <p className="text-muted-foreground text-xs">
            Drag & drop or click to browse (max. {formatBytes(maxSize)})
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
            >
              <XIcon className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Display extracted info */}
      {extractedInfo && (
        <div className="mt-2 p-2 border rounded-md bg-gray-50 text-sm">
          <p><strong>Name:</strong> {extractedInfo.name || "Not found"}</p>
          <p><strong>Email:</strong> {extractedInfo.email || "Not found"}</p>
          <p><strong>Phone:</strong> {extractedInfo.phone || "Not found"}</p>
          {extractedInfo.raw && <p><strong>Raw:</strong> {extractedInfo.raw}</p>}
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
