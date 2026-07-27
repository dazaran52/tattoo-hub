import type { Metadata } from 'next'
import { LandingInteractive } from '@/components/LandingInteractive'

export const metadata: Metadata = {
  title: 'Tattoo HUB — Find Tattoo Masters or Get Client Leads',
  description:
    'Tattoo HUB connects clients with the best local tattoo masters. Describe your idea once and get offers, or join as a master to receive hot leads without ad spend.',
}

// This page is a thin Server Component so it can export SEO metadata above.
// The actual UI is a multi-step, animated (framer-motion) experience driven
// entirely by client-side state, routing and the client-only language
// context, so the interactive tree lives in a dedicated client component.
export default function HomePage() {
  return <LandingInteractive />
}
