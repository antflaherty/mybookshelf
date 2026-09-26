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

const TO_BE_READ = "to be read";
const CURRENTLY_READING = "currently reading";
const FINISHED = "finished";

interface ShelfContextValue {
  shelves: Shelf[];
  toBeRead: Shelf;
  currentlyReading: Shelf;
  finished: Shelf;
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
        toBeRead: shelves.find(({ name }) => name === TO_BE_READ)!,
        currentlyReading: shelves.find(
          ({ name }) => name === CURRENTLY_READING,
        )!,
        finished: shelves.find(({ name }) => name === FINISHED)!,
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
