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
  isLoading: boolean;
  loadShelves: () => Promise<void>;
}

const ShelfContext = createContext<ShelfContextValue | undefined>(undefined);

export default function ShelfProvider({ children }: { children: ReactNode }) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { accessToken } = useAuth();

  async function loadShelves() {
    setIsLoading(true);
    const shelves = await getShelves(accessToken);
    setShelves(shelves.sort((a, b) => a.sortOrder - b.sortOrder));
    setIsLoading(false);
  }
  useEffect(() => {
    async function load() {
      const shelves = await getShelves(accessToken);

      setShelves(shelves.sort((a, b) => a.sortOrder - b.sortOrder));
      setIsLoading(false);
    }

    load();
  }, [accessToken]);

  return (
    <ShelfContext.Provider
      value={{
        shelves,
        toBeRead: shelves.find(({ name }) => name === TO_BE_READ)!,
        currentlyReading: shelves.find(
          ({ name }) => name === CURRENTLY_READING,
        )!,
        finished: shelves.find(({ name }) => name === FINISHED)!,
        isLoading,
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
