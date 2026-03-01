import { createFileRoute } from '@tanstack/react-router'
import { SetupPage } from '@/features/setup/SetupPage'

export const Route = createFileRoute('/')({
  component: SetupPage,
})
