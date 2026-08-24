import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { QuestionListPage } from '@/features/questions/pages/QuestionListPage'
import { QuestionDetailPage } from '@/features/questions/pages/QuestionDetailPage'
import { CreateQuestionPage } from '@/features/questions/pages/CreateQuestionPage'
import { EditQuestionPage } from '@/features/questions/pages/EditQuestionPage'
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage'
import { CreateQuestionFormPage } from '@/features/questionForms/pages/CreateQuestionFormPage'
import { QuestionFormDetailPage } from '@/features/questionForms/pages/QuestionFormDetailPage'
import { EditQuestionFormPage } from '@/features/questionForms/pages/EditQuestionFormPage'
import { QfdPreviewPage } from '@/features/questionForms/pages/QfdPreviewPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'questions', element: <QuestionListPage /> },
      { path: 'questions/new', element: <CreateQuestionPage /> },
      { path: 'questions/:id', element: <QuestionDetailPage /> },
      { path: 'questions/:id/edit', element: <EditQuestionPage /> },
      { path: 'questions/:id/forms/new', element: <CreateQuestionFormPage /> },
      {
        path: 'questions/:id/forms/:formId',
        element: <QuestionFormDetailPage />,
      },
      {
        path: 'questions/:id/forms/:formId/edit',
        element: <EditQuestionFormPage />,
      },
      {
        path: 'questions/:id/forms/:formId/preview',
        element: <QfdPreviewPage />,
      },
      { path: 'categories', element: <CategoriesPage /> },
    ],
  },
])
