import { useAuth } from "@/auth/auth-context";
import { getBookDetails } from "@/api/apiClient";
import { useCallback } from "react";

export function useBook() {
  const { accessToken } = useAuth();

  const getBookDetailsWithAuth = useCallback(
    (id: string) => getBookDetails(accessToken, id),
    [accessToken],
  );

  return {
    getBookDetails: getBookDetailsWithAuth,
  };
}
