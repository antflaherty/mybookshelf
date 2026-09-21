import { createContext, ReactNode, useContext, useState } from "react";

export interface Theme {
  name: string;
  background: string;
  text: string;
  primary: string;
  secondary: string;
  errorText: string;
  errorInputBackground: string;
  inputBackground: string;
  inputText: string;
}

const themes: { [name: string]: Theme } = {
  forest: {
    name: "forest",
    background: "#02551b",
    text: "#def2a2",
    primary: "#925808",
    secondary: "#287a41",
    errorText: "#f09875",
    errorInputBackground: "#f4c4aa",
    inputBackground: "#f4d8aa",
    inputText: "#0f2904",
  },
  sky: {
    name: "sky",
    background: "#6ebeff",
    text: "#000000",
    primary: "#ffffff",
    secondary: "#abd8fd",
    errorText: "#521700",
    errorInputBackground: "#f4c4aa",
    inputBackground: "#c9e1f5",
    inputText: "#000000",
  },
};

export const THEME_NAMES = Object.keys(themes);

interface ThemeContextValue {
  theme: Theme;
  setTheme: (themeName: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(themes.forest);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: (themeName) => {
          setTheme(themes[themeName]);
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
