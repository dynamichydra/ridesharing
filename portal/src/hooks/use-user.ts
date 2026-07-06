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
  });  
  return { user, isLoading, isError };
}
