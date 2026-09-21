import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Login } from "./api";
import type { LoginData } from "./types";
import toast from "react-hot-toast";

export function useLogin() {
  const queryClient = useQueryClient();
  const { mutate, data, isPending, isError, error, isSuccess } = useMutation({
    mutationFn: (inputData: LoginData) => Login(inputData),
    onSuccess: (res) => {
      queryClient.setQueryData(['current-user'], res);
      toast.success('Login Successful');
    }
  });

  return {
    login: mutate,
    data,
    isLoading: isPending,
    isError,
    error,
    isSuccess,
  };
}
