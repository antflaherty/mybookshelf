import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme, THEMES } from "@/theme/themes";

const THEME_STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (themeName: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(THEMES.forest);

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
          const newTheme = THEMES[themeName];
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
