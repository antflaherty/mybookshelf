import {
  createContext,
  ReactNode,
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
import { login as apiLogin } from "@/api/apiClient";

interface AuthContextValue {
  accessToken: string | null;
  isLoggedIn: boolean;
  login: (user: User) => Promise<void>;
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

  async function login(user: User) {
    const accessToken = await apiLogin(user);

    setAccessToken(accessToken);

    storeAccessToken(accessToken);
  }

  async function logout() {
    setAccessToken(null);
    await deleteAccessToken();
  }

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
