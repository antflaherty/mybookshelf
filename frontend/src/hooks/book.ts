import { useAuth } from "@/auth/auth-context";
import { getBookDetails } from "@/api/apiClient";

export function useBook() {
  const { accessToken } = useAuth();

  return {
    getBookDetails: (id: string) => {
      return getBookDetails(accessToken, id);
    },
  };
}
