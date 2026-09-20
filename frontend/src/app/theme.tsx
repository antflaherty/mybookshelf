import { createContext, ReactNode, useContext, useState } from "react";

type ThemeName = "forest" | "sky";

export interface Theme {
  name: ThemeName;
  background: string;
  text: string;
  primary: string;
  inputBackground: string;
  inputText: string;
}

export const THEMES: { [name: string]: Theme } = {
  forest: {
    name: "forest",
    background: "#02551b",
    text: "#def2a2",
    primary: "#925808",
    inputBackground: "#f4d8aa",
    inputText: "#0f2904",
  },
  sky: {
    name: "sky",
    background: "#6ebeff",
    text: "#000000",
    primary: "#ffffff",
    inputBackground: "#c9e1f5",
    inputText: "#000000",
  },
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (themeName: ThemeName) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(THEMES.forest);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: (themeName) => {
          setTheme(THEMES[themeName]);
        },
      }}
    >
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
