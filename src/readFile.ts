/**
 * Promise based simple file reading for browser
 * @param file
 */

export function readFile(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    var reader = new FileReader()
    reader.onabort = () => reject("file reading was aborted")
    reader.onerror = () => reject("file reading has failed")
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject("not a string")

    reader.readAsText(file)
  })
}
