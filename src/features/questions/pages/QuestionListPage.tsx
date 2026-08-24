import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useQuestions, useDeleteQuestion } from '../hooks/useQuestions'
import { QuestionCard } from '../components/QuestionCard'
import { QuestionFilters } from '../components/QuestionFilters'
import type { QuestionListItemDto } from '@/api/questions/questionsApi'

export function QuestionListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<QuestionListItemDto | null>(
    null
  )

  const { data: questions, isLoading, isError } = useQuestions()
  const deleteQuestion = useDeleteQuestion()

  const filtered = useMemo(() => {
    if (!questions) return []
    return questions.filter((q) => {
      const matchesSearch =
        !search ||
        q.shortDescription.toLowerCase().includes(search.toLowerCase()) ||
        q.longDescription.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [questions, search, statusFilter])

  if (isLoading) return <PageLoader />

  if (isError) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-destructive">
          Failed to load questions. Please try again.
        </p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Questions"
        description={
          questions
            ? `${questions.length} question${questions.length !== 1 ? 's' : ''} in the bank`
            : 'Manage all question definitions.'
        }
        actions={
          <Button asChild>
            <Link to="/questions/new">
              <Plus className="size-4" />
              New Question
            </Link>
          </Button>
        }
      />

      <QuestionFilters
        search={search}
        status={statusFilter}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((q) => (
            <QuestionCard key={q.id} question={q} onDelete={setDeleteTarget} />
          ))}
        </div>
      ) : questions && questions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No questions yet"
          description="Create your first question to get started."
          action={
            <Button asChild>
              <Link to="/questions/new">
                <Plus className="size-4" />
                New Question
              </Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="No results"
          description="No questions match your current filters."
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Delete "${deleteTarget?.shortDescription}"?`}
        description="This will permanently delete the question and all its interactions, stimuli, and associations."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            deleteQuestion.mutate(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}
