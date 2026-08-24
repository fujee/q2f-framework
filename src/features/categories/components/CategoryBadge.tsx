import { Badge } from '@/components/ui/badge'

interface CategoryBadgeProps {
  name: string
  className?: string
}

export function CategoryBadge({ name, className }: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-normal ${className ?? ''}`}
    >
      {name}
    </Badge>
  )
}
