import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider } from "@/app/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      ></Stack>
    </ThemeProvider>
  );
}
