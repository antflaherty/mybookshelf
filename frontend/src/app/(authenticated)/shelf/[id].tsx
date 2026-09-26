import { router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useShelf } from "@/context/shelf-provider";
import { useTheme } from "@/theme/theme-provider";
import { CurrentShelfContext } from "@/context/current-shelf-provider";
import BookSearchResultList from "@/components/book-search-result-list";
import ThemedPressable from "@/components/themed-pressable";

export default function ShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shelves } = useShelf();
  const { theme } = useTheme();

  const shelf = shelves.find((shelf) => shelf.id === id);

  return (
    <CurrentShelfContext.Provider value={id}>
      <Stack.Screen options={{ title: shelf?.name }}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {shelf === undefined ? (
            <Text style={{ color: theme.text }}>shelf not found</Text>
          ) : (
            <BookSearchResultList
              books={shelf.bookmarks}
            ></BookSearchResultList>
          )}
          <ThemedPressable>
            <Text
              style={{ color: theme.text }}
              onPress={() => {
                router.push({
                  pathname: "/search-books",
                  params: {
                    shelfId: id,
                  },
                });
              }}
            >
              add book to shelf
            </Text>
          </ThemedPressable>
        </View>
      </Stack.Screen>
    </CurrentShelfContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
