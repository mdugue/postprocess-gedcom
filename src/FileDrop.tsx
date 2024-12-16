import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UploadIcon } from "lucide-react"
import { type Accept, useDropzone } from "react-dropzone"

function FileDrop(props: {
  accept?: Accept
  title: string
  onDrop: (files: File[]) => void
}) {
  const { accept, title, onDrop } = props
  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept,
    })

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.path}>
      {file.path} - {file.size} bytes
      <ul>
        {errors.map((e) => (
          <li key={e.code}>{e.message}</li>
        ))}
      </ul>
    </li>
  ))

  return (
    <div
      {...getRootProps()}
      className="border-gray-300 text-gray-600 border border-dashed px-3 py-5 cursor-pointer rounded-lg text-center hover:bg-white flex place-items-center justify-center"
    >
      <input {...getInputProps()} />

      <Alert className="my-32 mx-4 max-w-screen-sm">
        <UploadIcon className="h-4 w-4" />
        <AlertTitle>
          {isDragActive
            ? "Drop the files here ..."
            : fileRejectionItems.length > 0
            ? "File type not supported"
            : title}
        </AlertTitle>
        <AlertDescription>
          {fileRejectionItems.length > 0 ? (
            <ul>{fileRejectionItems}</ul>
          ) : (
            "You can add files by dropping them here or clicking to select"
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default FileDrop
