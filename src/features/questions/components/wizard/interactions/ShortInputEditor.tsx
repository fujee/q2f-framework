import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BaseInteractionEditor } from './BaseInteractionEditor'
import {
  shortInputSchema,
  type ShortInputFormData,
} from '@/features/questions/validation/interactionSchemas'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type { ShortInput } from '@/domain/qd/model'

interface ShortInputEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

export function ShortInputEditor({
  interaction,
  onSave,
  onClose,
}: ShortInputEditorProps) {
  const shortInput = interaction.type === 'ShortInput' ? interaction : undefined
  const [correctValues, setCorrectValues] = useState<string[]>(
    shortInput?.correctValues.map(String) ?? []
  )
  const [inputVal, setInputVal] = useState('')
  const [minLength, setMinLength] = useState(
    shortInput?.inputType === 'Text'
      ? (shortInput.minLength?.toString() ?? '')
      : ''
  )
  const [maxLength, setMaxLength] = useState(
    shortInput?.inputType === 'Text'
      ? (shortInput.maxLength?.toString() ?? '')
      : ''
  )
  const [minValue, setMinValue] = useState(
    shortInput && shortInput.inputType !== 'Text'
      ? (shortInput.minValue?.toString() ?? '')
      : ''
  )
  const [maxValue, setMaxValue] = useState(
    shortInput && shortInput.inputType !== 'Text'
      ? (shortInput.maxValue?.toString() ?? '')
      : ''
  )
  const [valueError, setValueError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ShortInputFormData>({
    resolver: zodResolver(shortInputSchema),
    defaultValues: {
      code: interaction.code,
      instruction: interaction.instruction ?? '',
      inputType: shortInput?.inputType ?? 'Text',
    },
  })

  const inputType = watch('inputType')

  const addValue = (raw: string) => {
    const val = raw.trim()
    if (val && !correctValues.includes(val))
      setCorrectValues([...correctValues, val])
    setInputVal('')
  }

  const removeValue = (v: string) =>
    setCorrectValues(correctValues.filter((x) => x !== v))

  const onSubmit = (data: ShortInputFormData) => {
    if (correctValues.length < 1) {
      setValueError('At least one correct value is required.')
      return
    }
    setValueError(null)
    const base = {
      id: interaction.id,
      code: data.code,
      instruction: data.instruction,
    }
    let updated: ShortInput
    if (data.inputType === 'Number') {
      updated = {
        ...base,
        type: 'ShortInput',
        inputType: 'Number',
        correctValues: correctValues.map(Number),
        minValue: minValue === '' ? undefined : Number(minValue),
        maxValue: maxValue === '' ? undefined : Number(maxValue),
      }
    } else if (data.inputType === 'Date') {
      updated = {
        ...base,
        type: 'ShortInput',
        inputType: 'Date',
        correctValues,
        minValue: minValue === '' ? undefined : minValue,
        maxValue: maxValue === '' ? undefined : maxValue,
      }
    } else {
      updated = {
        ...base,
        type: 'ShortInput',
        inputType: 'Text',
        correctValues,
        caseSensitive: false,
        trimWhitespace: true,
        minLength: minLength === '' ? undefined : Number(minLength),
        maxLength: maxLength === '' ? undefined : Number(maxLength),
      }
    }
    onSave(updated)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <BaseInteractionEditor
        register={register}
        control={control}
        errors={errors}
      />
      <Separator />

      <div className="space-y-1.5">
        <Label>Input Type</Label>
        <Controller
          name="inputType"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Text">Text</SelectItem>
                <SelectItem value="Number">Number</SelectItem>
                <SelectItem value="Date">Date</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Correct Values</Label>
        <div className="flex flex-wrap gap-1.5">
          {correctValues.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-mono"
            >
              {v}
              <button
                type="button"
                onClick={() => removeValue(v)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            className="w-48 font-mono text-sm"
            type={
              inputType === 'Number'
                ? 'number'
                : inputType === 'Date'
                  ? 'date'
                  : 'text'
            }
            placeholder={
              inputType === 'Date' ? 'YYYY-MM-DD' : 'Accepted answer'
            }
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addValue(inputVal)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addValue(inputVal)}
          >
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
        {valueError && <p className="text-xs text-destructive">{valueError}</p>}
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        {inputType === 'Text' ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="sin-min-length">Min Length</Label>
              <Input
                id="sin-min-length"
                type="number"
                min={0}
                placeholder="Optional"
                value={minLength}
                onChange={(e) => setMinLength(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sin-max-length">Max Length</Label>
              <Input
                id="sin-max-length"
                type="number"
                min={0}
                placeholder="Optional"
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="sin-min-value">Min Value</Label>
              <Input
                id="sin-min-value"
                type={inputType === 'Date' ? 'date' : 'number'}
                placeholder="Optional"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sin-max-value">Max Value</Label>
              <Input
                id="sin-max-value"
                type={inputType === 'Date' ? 'date' : 'number'}
                placeholder="Optional"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Interaction</Button>
      </div>
    </form>
  )
}
