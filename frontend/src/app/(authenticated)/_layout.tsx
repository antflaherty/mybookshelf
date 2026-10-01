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
          name="book/[id]"
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
          name="review-book"
          options={{
            headerBackButtonDisplayMode: "generic",
            title: "leave a review",
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
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
        <Stack.Screen
          name="reviews/[bookId]"
          options={{
            headerTintColor: theme.text,
            headerBackButtonDisplayMode: "generic",
            headerStyle: { backgroundColor: theme.background },
            title: "",
          }}
        />
      </Stack>
    </ShelfProvider>
  );
}
