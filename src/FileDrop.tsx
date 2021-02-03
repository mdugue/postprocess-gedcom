import { useDropzone } from "react-dropzone"

function FileDrop(props: {
  accept?: string
  title: string
  onDrop: (files: File[]) => void
}) {
  const { accept, title, onDrop } = props
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
  })

  return (
    <div
      {...getRootProps()}
      className="border-gray-300 text-gray-600 border-2 border-dashed px-3 py-5 cursor-pointer rounded-lg text-center hover:bg-white flex place-items-center justify-center"
    >
      <input {...getInputProps()} />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        className="w-8 h-8 text-gray-400 pr-1"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {isDragActive ? <p>Drop the files here ...</p> : <p>{title}</p>}
    </div>
  )
}

export default FileDrop
