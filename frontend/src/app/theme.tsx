import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "theme";

interface Theme {
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
  sunset: {
    name: "sunset",
    background: "#7a2e2e",
    text: "#ffe4b5",
    primary: "#ffb703",
    secondary: "#c94c4c",
    errorText: "#ffdddd",
    errorInputBackground: "#b85c5c",
    inputBackground: "#f4d8aa",
    inputText: "#3a1515",
  },
  ocean: {
    name: "ocean",
    background: "#064663",
    text: "#d9f3ff",
    primary: "#00a8cc",
    secondary: "#087e8b",
    errorText: "#ffb4a2",
    errorInputBackground: "#8f5c5c",
    inputBackground: "#c9e9f2",
    inputText: "#032b3a",
  },
  lavender: {
    name: "lavender",
    background: "#4b3f72",
    text: "#f1e8ff",
    primary: "#d8b4fe",
    secondary: "#7666a8",
    errorText: "#ffb4b4",
    errorInputBackground: "#8f6875",
    inputBackground: "#e6ddf5",
    inputText: "#251d3a",
  },
  autumn: {
    name: "autumn",
    background: "#6b3e26",
    text: "#ffe8c2",
    primary: "#e09f3e",
    secondary: "#9e5a3c",
    errorText: "#ffb5a7",
    errorInputBackground: "#9e6860",
    inputBackground: "#f2d5ad",
    inputText: "#321a0e",
  },
  midnight: {
    name: "midnight",
    background: "#111827",
    text: "#e5e7eb",
    primary: "#60a5fa",
    secondary: "#374151",
    errorText: "#fca5a5",
    errorInputBackground: "#4b2525",
    inputBackground: "#1f2937",
    inputText: "#f3f4f6",
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

  useEffect(() => {
    async function loadTheme() {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);

      if (storedTheme) {
        setTheme(JSON.parse(storedTheme));
      }
    }

    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: (themeName) => {
          const newTheme = themes[themeName];
          setTheme(newTheme);
          AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme));
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
