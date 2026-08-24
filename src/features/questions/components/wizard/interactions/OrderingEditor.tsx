import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
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
  orderingScalarSchema,
  type OrderingScalarFormData,
} from '@/features/questions/validation/interactionSchemas'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type { Ordering, OrderingItem } from '@/domain/qd/model'

interface OrderingEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

export function OrderingEditor({
  interaction,
  onSave,
  onClose,
}: OrderingEditorProps) {
  const ordering = interaction.type === 'Ordering' ? interaction : undefined
  const [items, setItems] = useState<OrderingItem[]>(
    ordering?.orderingItems ?? []
  )
  const [correctOrder, setCorrectOrder] = useState<string[]>(
    ordering?.correctOrder ?? []
  )
  const [itemError, setItemError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OrderingScalarFormData>({
    resolver: zodResolver(orderingScalarSchema),
    defaultValues: {
      code: interaction.code,
      instruction: interaction.instruction ?? '',
      itemOrderPolicy: ordering?.itemOrderPolicy ?? 'Fixed',
    },
  })

  const addItem = () => {
    const id = crypto.randomUUID()
    setItems([...items, { id, code: `item${items.length + 1}`, name: '' }])
    setCorrectOrder([...correctOrder, id])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id))
    setCorrectOrder(correctOrder.filter((c) => c !== id))
  }

  const updateItemCode = (id: string, code: string) =>
    setItems(items.map((i) => (i.id === id ? { ...i, code } : i)))

  const updateItemName = (id: string, name: string) =>
    setItems(items.map((i) => (i.id === id ? { ...i, name } : i)))

  const moveOrder = (index: number, dir: 'up' | 'down') => {
    const next = [...correctOrder]
    const [item] = next.splice(index, 1)
    next.splice(dir === 'up' ? index - 1 : index + 1, 0, item)
    setCorrectOrder(next)
  }

  const onSubmit = (data: OrderingScalarFormData) => {
    if (items.length < 2) {
      setItemError('At least 2 items are required.')
      return
    }
    setItemError(null)
    const updated: Ordering = {
      id: interaction.id,
      type: 'Ordering',
      code: data.code,
      instruction: data.instruction,
      orderingItems: items,
      correctOrder,
      itemOrderPolicy: data.itemOrderPolicy,
    }
    onSave(updated)
  }

  // Map id → name for the correct order display
  const idToItem = Object.fromEntries(items.map((i) => [i.id, i]))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <BaseInteractionEditor
        register={register}
        control={control}
        errors={errors}
      />
      <Separator />

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-3.5" /> Add Item
          </Button>
        </div>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              className="w-24 shrink-0 font-mono text-xs"
              placeholder="Code"
              value={item.code}
              onChange={(e) => updateItemCode(item.id, e.target.value)}
            />
            <Input
              className="flex-1"
              placeholder="Display name"
              value={item.name}
              onChange={(e) => updateItemName(item.id, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {itemError && <p className="text-xs text-destructive">{itemError}</p>}
      </div>

      {/* Correct order */}
      {correctOrder.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label>Correct Order</Label>
            <p className="text-xs text-muted-foreground">
              Use the arrows to arrange items in the correct sequence.
            </p>
            <ol className="space-y-1.5">
              {correctOrder.map((id, i) => (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5"
                >
                  <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">
                    {idToItem[id]?.name || idToItem[id]?.code || id}
                  </span>
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === 0}
                      onClick={() => moveOrder(i, 'up')}
                    >
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === correctOrder.length - 1}
                      onClick={() => moveOrder(i, 'down')}
                    >
                      <ChevronDown className="size-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      <Separator />
      <div className="space-y-1.5">
        <Label>Item Order Policy</Label>
        <Controller
          name="itemOrderPolicy"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fixed">
                  Fixed (preserve item display order)
                </SelectItem>
                <SelectItem value="Permutable">
                  Permutable (shuffle items)
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
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
