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
            headerBackButtonDisplayMode: "generic",
            headerStyle: { backgroundColor: theme.background },
            title: "",
          }}
        />
        <Stack.Screen
          name="select-shelf"
          options={{
            headerBackButtonDisplayMode: "generic",
            headerTransparent: true,
            title: "select shelf",
          }}
        />
        <Stack.Screen
          name="shelf/[id]"
          options={{
            headerTintColor: theme.text,
            headerBackButtonDisplayMode: "generic",
            headerStyle: { backgroundColor: theme.background },
          }}
        />
      </Stack>
    </ShelfProvider>
  );
}
