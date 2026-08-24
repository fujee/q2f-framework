import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Plus, Search, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/shared/RichTextEditor'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import {
  useCategorizations,
  useCreateCategory,
} from '@/features/categories/hooks/useCategorizations'
import { CreateCategorizationDialog } from '@/features/categories/components/CreateCategorizationDialog'
import {
  step1Schema,
  type Step1FormData,
} from '@/features/questions/validation/questionSchemas'
import type { QuestionStatus } from '@/domain/qd/model'

const STATUS_OPTIONS: QuestionStatus[] = [
  'Draft',
  'Active',
  'Archived',
  'Deprecated',
]
const NO_SELECTION = '__none__'

/** Prevent an input's Enter key from bubbling up and submitting a parent form. */
function stopEnter(e: React.KeyboardEvent, callback?: () => void) {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    callback?.()
  }
}

interface Step1MetadataProps {
  onNext: () => void
}

export function Step1Metadata({ onNext }: Step1MetadataProps) {
  const { draft, updateDraft } = useQuestionEditorStore()
  const { data: categorizations } = useCategorizations()
  const createCategory = useCreateCategory()

  // ── Local UI state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [newCategorizationOpen, setNewCategorizationOpen] = useState(false)
  const [addingCategoryToId, setAddingCategoryToId] = useState<string | null>(
    null
  )
  const [newCategoryName, setNewCategoryName] = useState('')

  // ── Form ──────────────────────────────────────────────────────────────────────
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      shortDescription: draft.shortDescription,
      longDescription: draft.longDescription,
      status: draft.status,
      categoryIds: draft.categories,
    },
  })

  const categoryIds = watch('categoryIds')

  // ── Category helpers ──────────────────────────────────────────────────────────

  const setExclusiveCategory = (
    categorizationId: string,
    selectedCatId: string
  ) => {
    const cats =
      categorizations?.find((c) => c.id === categorizationId)?.categories ?? []
    const siblingIds = cats.map((c) => c.id)
    const withoutSiblings = (categoryIds ?? []).filter(
      (id) => !siblingIds.includes(id)
    )
    const updated =
      selectedCatId !== NO_SELECTION
        ? [...withoutSiblings, selectedCatId]
        : withoutSiblings
    setValue('categoryIds', updated, { shouldDirty: true })
  }

  const toggleCategory = (catId: string, checked: boolean) => {
    const current = categoryIds ?? []
    const updated = checked
      ? [...current, catId]
      : current.filter((id) => id !== catId)
    setValue('categoryIds', updated, { shouldDirty: true })
  }

  const removeCategory = (catId: string) =>
    setValue(
      'categoryIds',
      (categoryIds ?? []).filter((id) => id !== catId),
      {
        shouldDirty: true,
      }
    )

  // ── Derived data ──────────────────────────────────────────────────────────────

  const selectedTags = (categoryIds ?? []).flatMap((id) => {
    for (const cat of categorizations ?? []) {
      const found = cat.categories.find((c) => c.id === id)
      if (found) {
        return [
          {
            categoryId: id,
            categoryName: found.name,
            categorizationName: cat.name,
          },
        ]
      }
    }
    return []
  })

  const searchResults = search.trim()
    ? (categorizations ?? [])
        .map((cat) => ({
          ...cat,
          matchedCategories: [...cat.categories]
            .sort((a, b) => a.order - b.order)
            .filter(
              (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                cat.name.toLowerCase().includes(search.toLowerCase())
            ),
        }))
        .filter(
          (cat) =>
            // Include if any category name matches OR the categorization name itself matches
            // (covers newly created categorizations that have no categories yet)
            cat.matchedCategories.length > 0 ||
            cat.name.toLowerCase().includes(search.toLowerCase())
        )
    : []

  const hasSearch = search.trim().length > 0

  // Categorizations where at least one category is currently selected.
  // Shown when the user is NOT searching so they can quickly adjust existing picks.
  const activeCategorizations = !hasSearch
    ? (categorizations ?? []).filter((cat) =>
        cat.categories.some((c) => (categoryIds ?? []).includes(c.id))
      )
    : []

  // ── Add category inline ───────────────────────────────────────────────────────

  const openAddCategory = (categorizationId: string) => {
    setAddingCategoryToId((prev) =>
      prev === categorizationId ? null : categorizationId
    )
    setNewCategoryName('')
  }

  const handleAddCategory = (categorizationId: string) => {
    if (!newCategoryName.trim()) return
    createCategory.mutate(
      { categorizationId, data: { name: newCategoryName.trim() } },
      {
        onSuccess: () => {
          setNewCategoryName('')
          setAddingCategoryToId(null)
        },
      }
    )
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  const onSubmit = (data: Step1FormData) => {
    updateDraft({
      shortDescription: data.shortDescription,
      longDescription: data.longDescription,
      status: data.status,
      categories: data.categoryIds,
    })
    onNext()
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  // CreateCategorizationDialog is placed OUTSIDE the <form> (sibling in fragment)
  // so that its own internal form cannot accidentally propagate submit events
  // through React's fiber tree to this form's onSubmit handler.

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Basic info ── */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Short Description <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="shortDescription"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  minimal
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Brief title for this question"
                />
              )}
            />
            {errors.shortDescription && (
              <p className="text-xs text-destructive">
                {errors.shortDescription.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Long Description <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="longDescription"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Full description or instructions for this question…"
                />
              )}
            />
            {errors.longDescription && (
              <p className="text-xs text-destructive">
                {errors.longDescription.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* ── Categories ── */}
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Categories</p>
              <p className="text-xs text-muted-foreground">
                Search to find and assign categories.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewCategorizationOpen(true)}
            >
              <Plus className="size-3.5" />
              New Categorization
            </Button>
          </div>

          {/* Selected tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map(
                ({ categoryId, categoryName, categorizationName }) => (
                  <span
                    key={categoryId}
                    className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    <span className="font-normal text-primary/70">
                      {categorizationName}:
                    </span>
                    {categoryName}
                    <button
                      type="button"
                      onClick={() => removeCategory(categoryId)}
                      aria-label={`Remove ${categoryName}`}
                      className="ml-0.5 rounded-full hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )
              )}
            </div>
          )}

          {/* Search input — Enter is blocked so it never submits this form */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                selectedTags.length > 0
                  ? 'Search to add more categories…'
                  : 'Search to find and add categories…'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => stopEnter(e)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* No results */}
          {hasSearch && searchResults.length === 0 && (
            <p className="text-sm italic text-muted-foreground">
              No categories match &ldquo;{search}&rdquo;.
            </p>
          )}

          {/* Active categorizations (those with current selections) — visible when not searching */}
          {!hasSearch && activeCategorizations.length > 0 && (
            <div className="space-y-4 rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Categorizations with current selections — click to change:
              </p>
              {activeCategorizations.map((cat) => {
                const isAdding = addingCategoryToId === cat.id
                const allCats = [...cat.categories].sort(
                  (a, b) => a.order - b.order
                )

                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {cat.name}
                        </span>
                        {cat.isExclusive && (
                          <Badge variant="outline" className="py-0 text-xs">
                            exclusive
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-xs"
                        onClick={() => openAddCategory(cat.id)}
                      >
                        <Plus className="size-3" />
                        Add category
                      </Button>
                    </div>

                    {isAdding && (
                      <div className="flex gap-2">
                        <Input
                          autoFocus
                          className="h-7 flex-1 text-sm"
                          placeholder="New category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) =>
                            stopEnter(e, () => handleAddCategory(cat.id))
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 shrink-0"
                          disabled={
                            !newCategoryName.trim() || createCategory.isPending
                          }
                          onClick={() => handleAddCategory(cat.id)}
                        >
                          {createCategory.isPending ? 'Adding…' : 'Add'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0"
                          onClick={() => setAddingCategoryToId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {allCats.map((c) => {
                        const isSelected = (categoryIds ?? []).includes(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (cat.isExclusive) {
                                setExclusiveCategory(
                                  cat.id,
                                  isSelected ? NO_SELECTION : c.id
                                )
                              } else {
                                toggleCategory(c.id, !isSelected)
                              }
                            }}
                            className={cn(
                              'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background hover:border-primary/40 hover:bg-muted'
                            )}
                          >
                            {isSelected && (
                              <Check className="size-3 shrink-0" />
                            )}
                            {c.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-4 rounded-md border border-border p-3">
              {searchResults.map((cat) => {
                const isAdding = addingCategoryToId === cat.id

                return (
                  <div key={cat.id} className="space-y-2">
                    {/* Categorization header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {cat.name}
                        </span>
                        {cat.isExclusive && (
                          <Badge variant="outline" className="py-0 text-xs">
                            exclusive
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-xs"
                        onClick={() => openAddCategory(cat.id)}
                      >
                        <Plus className="size-3" />
                        Add category
                      </Button>
                    </div>

                    {/* Inline add form — Enter is blocked so it never submits the outer form */}
                    {isAdding && (
                      <div className="flex gap-2">
                        <Input
                          autoFocus
                          className="h-7 flex-1 text-sm"
                          placeholder="New category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) =>
                            stopEnter(e, () => handleAddCategory(cat.id))
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 shrink-0"
                          disabled={
                            !newCategoryName.trim() || createCategory.isPending
                          }
                          onClick={() => handleAddCategory(cat.id)}
                        >
                          {createCategory.isPending ? 'Adding…' : 'Add'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0"
                          onClick={() => setAddingCategoryToId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {/* Category chips — or hint if the categorization is empty */}
                    <div className="flex flex-wrap gap-1.5">
                      {cat.matchedCategories.length > 0 ? (
                        cat.matchedCategories.map((c) => {
                          const isSelected = (categoryIds ?? []).includes(c.id)
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                if (cat.isExclusive) {
                                  setExclusiveCategory(
                                    cat.id,
                                    isSelected ? NO_SELECTION : c.id
                                  )
                                } else {
                                  toggleCategory(c.id, !isSelected)
                                }
                              }}
                              className={cn(
                                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted'
                              )}
                            >
                              {isSelected && (
                                <Check className="size-3 shrink-0" />
                              )}
                              {c.name}
                            </button>
                          )
                        })
                      ) : (
                        <p className="text-xs italic text-muted-foreground">
                          No categories yet — click &ldquo;+ Add category&rdquo;
                          above to add the first one.
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!hasSearch && (categorizations ?? []).length === 0 && (
            <div className="rounded-md border border-dashed border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No categorizations yet.{' '}
                <button
                  type="button"
                  className="text-primary underline hover:no-underline"
                  onClick={() => setNewCategorizationOpen(true)}
                >
                  Create one
                </button>
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit">
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </form>

      {/*
       * Rendered OUTSIDE <form> so its internal <form onSubmit> cannot
       * propagate events through React's fiber tree to the outer form's
       * onSubmit handler.
       */}
      <CreateCategorizationDialog
        open={newCategorizationOpen}
        onOpenChange={setNewCategorizationOpen}
        onCreated={(name) => setSearch(name)}
      />
    </>
  )
}
