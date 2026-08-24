import { Link } from 'react-router-dom'
import { BookOpen, Tags, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'

const QUICK_LINKS = [
  {
    to: '/questions',
    icon: BookOpen,
    title: 'Question Bank',
    description: 'Browse, search, and manage your question definitions.',
  },
  {
    to: '/categories',
    icon: Tags,
    title: 'Categories',
    description: 'Manage categorizations like Subject, Difficulty, and Grade.',
  },
]

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome to TM Studio. Start by browsing your question bank or creating a new question."
        actions={
          <Button asChild>
            <Link to="/questions/new">
              <Plus className="size-4" />
              New Question
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {QUICK_LINKS.map(({ to, icon: Icon, title, description }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
