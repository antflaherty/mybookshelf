import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useShelf } from "@/context/shelf-provider";
import { useTheme } from "@/theme/theme-provider";
import ShelfCard from "@/components/shelf-card";
import BookSearchResultList from "@/components/book-search-result-list";

export default function ShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shelves } = useShelf();
  const { theme } = useTheme();

  const shelf = shelves.find((shelf) => shelf.id === id);

  return (
    <Stack.Screen options={{ title: shelf?.name }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {shelf === undefined ? (
          <Text style={{ color: theme.text }}>shelf not found</Text>
        ) : (
          <BookSearchResultList books={shelf.bookmarks}></BookSearchResultList>
        )}
      </View>
    </Stack.Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
