import { Stack } from "expo-router";
import ThemeProvider from "@/theme/theme-provider";

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
