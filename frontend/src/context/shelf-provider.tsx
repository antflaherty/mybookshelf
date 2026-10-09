import { getShelves } from "@/api/apiClient";
import { Shelf } from "@/lib/definitions";
import { useAuth } from "@/auth/auth-context";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

const TO_BE_READ = "to be read";
const CURRENTLY_READING = "currently reading";
const FINISHED = "finished";

interface ShelfContextValue {
  shelves: Shelf[];
  /**
   * `undefined` when the shelves have not loaded, failed to load, or do not contain the named
   * shelf. Consumers must handle it: these used to be non-null-asserted, so a failed load
   * handed `undefined` downstream to crash on `currentlyReading.id`.
   */
  toBeRead: Shelf | undefined;
  currentlyReading: Shelf | undefined;
  finished: Shelf | undefined;
  isLoading: boolean;
  error: string | null;
  loadShelves: () => Promise<void>;
}

const ShelfContext = createContext<ShelfContextValue | undefined>(undefined);

interface ShelfLoadResult {
  shelves: Shelf[];
  error: string | null;
}

/**
 * Fetches and sorts without touching state, so both the effect and a manual retry share one
 * implementation and one sort.
 */
async function fetchShelves(accessToken: string | null): Promise<ShelfLoadResult> {
  try {
    const loaded = await getShelves(accessToken);

    // Copy before sorting: `sort` mutates, and the array may be shared with a caller.
    return {
      shelves: [...loaded].sort((a, b) => a.sortOrder - b.sortOrder),
      error: null,
    };
  } catch (caught) {
    // Empty rather than stale, so consumers cannot act on a list the server no longer backs.
    return {
      shelves: [],
      error: caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE,
    };
  }
}

export default function ShelfProvider({ children }: { children: ReactNode }) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { accessToken } = useAuth();

  const loadShelves = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchShelves(accessToken);

    setShelves(result.shelves);
    setError(result.error);
    // Cleared in all paths so a failure cannot leave the tabs screen spinning forever.
    setIsLoading(false);
  }, [accessToken]);

  useEffect(() => {
    // `isLoading` starts true and is only cleared once a load settles, so a token change does
    // not flash a spinner over content the user is already looking at.
    async function load() {
      const result = await fetchShelves(accessToken);

      setShelves(result.shelves);
      setError(result.error);
      setIsLoading(false);
    }

    load();
  }, [accessToken]);

  return (
    <ShelfContext.Provider
      value={{
        shelves,
        toBeRead: shelves.find(({ name }) => name === TO_BE_READ),
        currentlyReading: shelves.find(({ name }) => name === CURRENTLY_READING),
        finished: shelves.find(({ name }) => name === FINISHED),
        isLoading,
        error,
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
