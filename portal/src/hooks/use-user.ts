import { getCurrentUser } from "@/features/auth/api";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    // Validated against /admin/me — once per 5 minutes, not on every component mount.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return { user, isLoading, isError };
}
