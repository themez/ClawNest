import { createRootRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'

export const Route = createRootRoute({
  component: AppLayout,
})
