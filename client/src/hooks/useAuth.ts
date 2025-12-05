import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";

export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();

  return {
    user: user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || null,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.imageUrl,
    } : undefined,
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
    signOut,
  };
}
