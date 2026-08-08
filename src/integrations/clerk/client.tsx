// Clerk client integration
import { ClerkProvider as ClerkReactProvider, useUser, useAuth, useClerk } from '@clerk/clerk-react';
import type { ReactNode } from 'react';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? 
                               import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!CLERK_PUBLISHABLE_KEY) {
  console.error("Clerk publishable key is missing. Set VITE_CLERK_PUBLISHABLE_KEY.");
}

interface ClerkProviderProps {
  children: ReactNode;
  secretKey?: string;
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const signInUrl = `${appOrigin}/login`;
  const signUpUrl = `${appOrigin}/register`;

  return (
    <ClerkReactProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      fallbackRedirectUrl="/trade"
      forceRedirectUrl="/trade"
      afterSignOutUrl="/trade"
    >
      {children}
    </ClerkReactProvider>
  );
}

export const clerkSecretKey = import.meta.env.CLERK_SECRET_KEY;

// Server-side Clerk backend is instantiated in API routes, not client.
// Client-side only needs the publishable key + hooks above.
export { useUser, useAuth, useClerk };
