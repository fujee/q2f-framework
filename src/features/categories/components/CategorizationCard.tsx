import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useUpdateCategorization,
  useDeleteCategorization,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../hooks/useCategorizations'
import {
  categorizationSchema,
  categorySchema,
  type CategorizationFormData,
  type CategoryFormData,
} from '../validation/categorizationSchemas'
import type { CategorizationDto } from '@/api/categories/categorizationsApi'

type DeleteTarget =
  | { type: 'categorization' }
  | { type: 'category'; categoryId: string; categoryName: string }

interface CategorizationCardProps {
  categorization: CategorizationDto
}

export function CategorizationCard({
  categorization,
}: CategorizationCardProps) {
  const [isEditingCategorization, setIsEditingCategorization] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  )
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const updateCategorization = useUpdateCategorization()
  const deleteCategorization = useDeleteCategorization()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  // ─── Categorization edit form ────────────────────────────────────────────────
  const catForm = useForm<CategorizationFormData>({
    resolver: zodResolver(categorizationSchema),
    defaultValues: {
      name: categorization.name,
      isExclusive: categorization.isExclusive,
    },
  })

  const handleUpdateCategorization = (data: CategorizationFormData) => {
    updateCategorization.mutate(
      { id: categorization.id, data },
      { onSuccess: () => setIsEditingCategorization(false) }
    )
  }

  const openEditCategorization = () => {
    catForm.reset({
      name: categorization.name,
      isExclusive: categorization.isExclusive,
    })
    setIsEditingCategorization(true)
  }

  // ─── Category forms ──────────────────────────────────────────────────────────
  const addForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  })

  const editForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  })

  const handleAddCategory = (data: CategoryFormData) => {
    createCategory.mutate(
      { categorizationId: categorization.id, data },
      {
        onSuccess: () => {
          addForm.reset()
          setIsAddingCategory(false)
        },
      }
    )
  }

  const openAddCategory = () => {
    addForm.reset({ name: '' })
    setEditingCategoryId(null)
    setIsAddingCategory(true)
  }

  const openEditCategory = (categoryId: string, currentName: string) => {
    editForm.reset({ name: currentName })
    setEditingCategoryId(categoryId)
    setIsAddingCategory(false)
  }

  const handleUpdateCategory = (categoryId: string, data: CategoryFormData) => {
    updateCategory.mutate(
      { categorizationId: categorization.id, categoryId, data },
      { onSuccess: () => setEditingCategoryId(null) }
    )
  }

  // ─── Deletion ────────────────────────────────────────────────────────────────
  const deleteTitle = !deleteTarget
    ? ''
    : deleteTarget.type === 'categorization'
      ? `Delete "${categorization.name}"?`
      : `Delete "${deleteTarget.categoryName}"?`

  const deleteDescription =
    deleteTarget?.type === 'categorization'
      ? 'This will permanently delete the categorization and all its categories.'
      : 'This will permanently remove the category.'

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'categorization') {
      deleteCategorization.mutate(categorization.id)
    } else {
      deleteCategory.mutate({
        categorizationId: categorization.id,
        categoryId: deleteTarget.categoryId,
      })
    }
    setDeleteTarget(null)
  }

  return (
    <>
      <Card>
        {/* ── Card header: categorization info / edit form ── */}
        <CardHeader className="pb-3">
          {isEditingCategorization ? (
            <form
              onSubmit={catForm.handleSubmit(handleUpdateCategorization)}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`edit-cat-${categorization.id}`}>Name</Label>
                <Input
                  id={`edit-cat-${categorization.id}`}
                  autoFocus
                  {...catForm.register('name')}
                />
                {catForm.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {catForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="flex items-start gap-3">
                <input
                  id={`edit-excl-${categorization.id}`}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border accent-primary"
                  checked={catForm.watch('isExclusive')}
                  onChange={(e) =>
                    catForm.setValue('isExclusive', e.target.checked)
                  }
                />
                <Label
                  htmlFor={`edit-excl-${categorization.id}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  Exclusive
                </Label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingCategorization(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateCategorization.isPending}
                >
                  {updateCategorization.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate font-semibold text-foreground">
                  {categorization.name}
                </span>
                {categorization.isExclusive && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Exclusive
                  </Badge>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">
                      Actions for {categorization.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openEditCategorization}>
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget({ type: 'categorization' })}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardHeader>

        {/* ── Card body: category list ── */}
        <CardContent className="pt-0">
          {categorization.categories.length > 0 && (
            <ul className="mb-3 divide-y divide-border rounded-md border border-border">
              {[...categorization.categories]
                .sort((a, b) => a.order - b.order)
                .map((category) => (
                  <li key={category.id}>
                    {editingCategoryId === category.id ? (
                      <form
                        onSubmit={editForm.handleSubmit((data) =>
                          handleUpdateCategory(category.id, data)
                        )}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <Input
                          autoFocus
                          className="h-7 text-sm"
                          {...editForm.register('name')}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={() => setEditingCategoryId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs"
                          disabled={updateCategory.isPending}
                        >
                          Save
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">
                            {category.order}
                          </span>
                          <span className="text-sm text-foreground">
                            {category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              openEditCategory(category.id, category.name)
                            }
                          >
                            <Pencil className="size-3" />
                            <span className="sr-only">
                              Edit {category.name}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'category',
                                categoryId: category.id,
                                categoryName: category.name,
                              })
                            }
                          >
                            <Trash2 className="size-3" />
                            <span className="sr-only">
                              Delete {category.name}
                            </span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}

          {isAddingCategory ? (
            <form
              onSubmit={addForm.handleSubmit(handleAddCategory)}
              className="flex items-center gap-2"
            >
              <Input
                autoFocus
                placeholder="Category name"
                className="h-8 text-sm"
                {...addForm.register('name')}
              />
              {addForm.formState.errors.name && (
                <p className="shrink-0 text-xs text-destructive">
                  {addForm.formState.errors.name.message}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={() => {
                  addForm.reset()
                  setIsAddingCategory(false)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 shrink-0"
                disabled={createCategory.isPending}
              >
                {createCategory.isPending ? 'Adding…' : 'Add'}
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={openAddCategory}
            >
              <Plus className="size-4" />
              Add Category
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={deleteTitle}
        description={deleteDescription}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
