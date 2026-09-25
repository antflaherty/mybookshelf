import { useTheme } from "@/theme/theme-provider";
import { StyleSheet, Text, TextInput, View } from "react-native";
import ThemedPressable from "@/components/themed-pressable";
import { useAuth } from "@/auth/auth-context";
import { useShelf } from "@/context/shelf-provider";
import { Book } from "@/lib/definitions";
import { router, useLocalSearchParams } from "expo-router";
import { createBook, placeBookmark } from "@/api/apiClient";
import { useState } from "react";

export default function BookScreen() {
  const [pageCount, setPageCount] = useState("0");
  const { theme } = useTheme();
  const { accessToken } = useAuth();
  const { shelves, loadShelves } = useShelf();

  const { book: bookParam } = useLocalSearchParams<{
    book: string;
  }>();

  const book: Book = JSON.parse(bookParam);

  const isBookOnShelf = shelves.some((shelf) =>
    shelf.bookmarks.some((bookmark) => bookmark.id === book.id),
  );

  function handlePlaceBookmarkPress() {
    router.push({
      pathname: "/place-bookmark",
      params: {
        book: JSON.stringify(book),
      },
    });
  }

  async function handleAddToShelfPress() {
    const bookWithId = await createBook(accessToken, {
      ...book,
      pageCount: parseInt(pageCount),
    });

    const bookmark = {
      id: bookWithId.id,
      currentPage: 0,
      shelfId: shelves[0].id,
    };
    await placeBookmark(accessToken, bookmark);
    await loadShelves();

    router.push("/");
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text, fontWeight: "bold" }}>
        {book.title}
      </Text>
      <Text style={{ color: theme.text, fontStyle: "italic" }}>
        {book.author}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: theme.text }}>page count:</Text>
        <TextInput
          keyboardType="numeric"
          placeholder="page count"
          value={pageCount}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.inputText,
            },
          ]}
          onChangeText={setPageCount}
        />
      </View>
      {isBookOnShelf ? (
        <ThemedPressable variant="primary" onPress={handlePlaceBookmarkPress}>
          <Text style={{ color: theme.text }}>place bookmark</Text>
        </ThemedPressable>
      ) : (
        <ThemedPressable variant="primary" onPress={handleAddToShelfPress}>
          <Text style={{ color: theme.text }}>add to shelf</Text>
        </ThemedPressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    margin: 10,
    height: 50,
    width: 60,
    borderRadius: 19,
    paddingHorizontal: 8,
  },
});
