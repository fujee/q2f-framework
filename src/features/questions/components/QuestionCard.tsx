import { Link } from 'react-router-dom'
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CategoryBadge } from '@/features/categories/components/CategoryBadge'
import { QuestionStatusBadge } from './QuestionStatusBadge'
import { stripHtml } from '@/lib/html'
import type { QuestionListItemDto } from '@/api/questions/questionsApi'

interface QuestionCardProps {
  question: QuestionListItemDto
  onDelete: (question: QuestionListItemDto) => void
}

export function QuestionCard({ question, onDelete }: QuestionCardProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/questions/${question.id}`}
            className="truncate text-sm font-medium text-foreground hover:underline"
          >
            {stripHtml(question.shortDescription)}
          </Link>
          <QuestionStatusBadge status={question.status} />
        </div>

        {/* Description */}
        {question.longDescription && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {stripHtml(question.longDescription)}
          </p>
        )}

        {/* Category badges */}
        {question.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {question.categories.map((cat) => (
              <CategoryBadge key={cat.categoryId} name={cat.categoryName} />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/questions/${question.id}`}>
              <Eye className="size-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`/questions/${question.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(question)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
