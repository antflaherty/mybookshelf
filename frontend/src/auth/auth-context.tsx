import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  deleteAccessToken,
  getAccessToken,
  storeAccessToken,
} from "@/storage/secureStore";
import { User } from "@/lib/definitions";
import { login as apiLogin, setUnauthorizedHandler } from "@/api/apiClient";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  accessToken: string | null;
  isLoggedIn: boolean;
  login: (user: User) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    function restoreToken() {
      try {
        const storedToken = getAccessToken();

        setAccessToken(storedToken);
      } catch (error) {
        console.error("Failed to restore authentication", error);
      }
    }

    restoreToken();
  }, []);

  async function login(user: User): Promise<LoginResult> {
    try {
      const token = await apiLogin(user);

      // Awaited: if persistence fails we have a token in memory that will be gone on next
      // launch, which is worse than reporting the login as failed.
      await storeAccessToken(token);

      setAccessToken(token);

      return { ok: true };
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;

      return { ok: false, error: message };
    }
  }

  const logout = useCallback(async () => {
    setAccessToken(null);
    await deleteAccessToken();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isLoggedIn: !!accessToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
