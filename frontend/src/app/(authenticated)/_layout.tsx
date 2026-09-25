import { Stack } from "expo-router";
import ShelfProvider from "@/context/shelf-provider";
import { useTheme } from "@/theme/theme-provider";

export default function AuthenticatedLayout() {
  const { theme } = useTheme();

  return (
    <ShelfProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen
          name="book"
          options={{
            headerTintColor: theme.background,
            headerBackButtonDisplayMode: "generic",
            headerTransparent: true,
            title: "",
          }}
        />
      </Stack>
    </ShelfProvider>
  );
}
