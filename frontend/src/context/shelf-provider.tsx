import { getShelves } from "@/api/apiClient";
import { Shelf } from "@/lib/definitions";
import { useAuth } from "@/auth/auth-context";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface ShelfContextValue {
  shelves: Shelf[];
  loadShelves: () => Promise<void>;
}

const ShelfContext = createContext<ShelfContextValue | undefined>(undefined);

export default function ShelfProvider({ children }: { children: ReactNode }) {
  const [shelves, setShelves] = useState<Shelf[]>([]);

  const { accessToken } = useAuth();

  async function loadShelves() {
    setShelves(
      (await getShelves(accessToken)).sort((a, b) => a.sortOrder - b.sortOrder),
    );
  }
  useEffect(() => {
    loadShelves();
  }, []);

  return (
    <ShelfContext.Provider
      value={{
        shelves,
        loadShelves,
      }}
    >
      {children}
    </ShelfContext.Provider>
  );
}

export function useShelf() {
  const context = useContext(ShelfContext);

  if (!context) {
    throw new Error("useShelf must be used inside a ShelfProvider");
  }

  return context;
}
