import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

/**
 * Local auth state. `auth.me` returns the owner when a valid session cookie is
 * present, or null otherwise. Login/logout are plain tRPC calls — no external
 * identity provider involved.
 */
export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  return {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    isAuthenticated: Boolean(meQuery.data),
    logout,
    loggingOut: logoutMutation.isPending,
  };
}
