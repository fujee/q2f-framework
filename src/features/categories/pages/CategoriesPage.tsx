import { useState } from 'react'
import { Plus, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useCategorizations } from '../hooks/useCategorizations'
import { CategorizationCard } from '../components/CategorizationCard'
import { CreateCategorizationDialog } from '../components/CreateCategorizationDialog'

export function CategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: categorizations, isLoading, isError } = useCategorizations()

  if (isLoading) return <PageLoader />

  if (isError) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-destructive">
          Failed to load categorizations. Please try again.
        </p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage categorization schemas (Subject, Difficulty, Grade…) and their values."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            New Categorization
          </Button>
        }
      />

      {categorizations && categorizations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categorizations.map((cat) => (
            <CategorizationCard key={cat.id} categorization={cat} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Tags}
          title="No categorizations yet"
          description="Create a categorization to start organizing your questions by Subject, Difficulty, or Grade."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              New Categorization
            </Button>
          }
        />
      )}

      <CreateCategorizationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
