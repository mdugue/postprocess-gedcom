export const test = () => "yeah"

/* import { useEffect, useState } from "react"
import { CellProps, Column, Renderer } from "react-table"
import { Individual } from "./worker"

export const EditableCell: Renderer<CellProps<Individual, any>> = ({
  value: initialValue,
  row: { index },
  column: { id },
  //updateMyData, // This is a custom function that we supplied to our table instance
}) => {
  // We need to keep and update the state of the cell normally
  const [value, setValue] = useState<string>(initialValue)

  const onChange = (e) => {
    setValue(e.target.value)
  }

  // We'll only update the external data when the input is blurred
  const onBlur = () => {
     updateMyData(index, id, value)
  }

  // If the initialValue is changed external, sync it up with our state
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return <input value={value} onChange={onChange} onBlur={onBlur} />
}

export default EditableCell
 */
