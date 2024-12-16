import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Individual } from "@/worker"
import { Undo } from "lucide-react"
import { useList } from "react-use"

export default function RulesEditor(props: { individuals: Individual[] }) {
  const { individuals } = props
  const [rules, { push, updateAt, removeAt, set }] = useList<Rule>([])
  return (
    <div>
      <h2 className="text-xl font-bold">Rules</h2>
      <div className="flex flex-col gap-2">
        {rules.map((rule, index) => {
          const regex = rule.regex ? RegExp(rule.regex) : undefined
          const preview =
            regex &&
            individuals.filter((individual) => individual.name.match(regex))
          return (
            <div className="flex gap-2 border rounded-md p-2">
              <CustomRule
                rule={rule}
                setRule={(rule) => updateAt(index, rule)}
                preview={
                  preview
                    ? {
                        count: preview.length,
                        names: preview.map((individual) => ({
                          old: individual.name,
                          new: individual.name.replace(
                            regex,
                            rule?.replaceValue || ""
                          ),
                        })),
                      }
                    : undefined
                }
              />
              <Button
                size="icon"
                className="self-end"
                variant="ghost"
                onClick={() => removeAt(index)}
              >
                <Undo />
              </Button>
            </div>
          )
        })}
      </div>
      <Button
        onClick={() => push({ regex: "", replaceValue: Math.random() + "" })}
        size="sm"
      >
        Add
      </Button>
    </div>
  )
}

type Rule = {
  regex?: string
  replaceValue?: string
}

function CustomRule(props: {
  rule?: Rule
  setRule: (rule: Rule) => void
  preview?: { count: number; names: { old: string; new: string }[] }
}) {
  const { rule, setRule, preview } = props
  return (
    <div>
      <Label>
        Regex
        <Input onChange={(e) => setRule({ ...rule, regex: e.target.value })} />
      </Label>
      <Label>
        Replace
        <Input
          onChange={(e) => setRule({ ...rule, replaceValue: e.target.value })}
        />
      </Label>
      {preview && (
        <Collapsible>
          <CollapsibleTrigger>{preview.count}</CollapsibleTrigger>
          <CollapsibleContent>
            {preview.names.map((name, index) => (
              <div key={index}>{name.new}</div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
