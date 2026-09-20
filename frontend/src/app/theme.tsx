import { createContext, ReactNode, useContext, useState } from "react";

export interface Theme {
  backgroundColor: string;
  textColor: string;
}

export const DEFAULT_THEME: Theme = {
  backgroundColor: "#990099",
  textColor: "#dddddd",
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  console.log(theme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }

  return context;
}
