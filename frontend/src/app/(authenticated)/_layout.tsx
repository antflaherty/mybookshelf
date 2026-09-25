import { Stack } from "expo-router";
import ShelfProvider from "@/context/shelf-provider";

export default function AuthenticatedLayout() {
  return (
    <ShelfProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen name="book" options={{ headerShown: false }} />
      </Stack>
    </ShelfProvider>
  );
}
