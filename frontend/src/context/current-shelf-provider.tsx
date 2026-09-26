import { createContext, useContext } from "react";

const CurrentShelfContext = createContext<string | undefined>(undefined);

export function useCurrentShelf() {
  return useContext(CurrentShelfContext);
}

export { CurrentShelfContext };
