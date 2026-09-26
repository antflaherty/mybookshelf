import { useTheme } from "@/theme/theme-provider";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";
import ThemedPressable from "@/components/themed-pressable";
import { searchBooks } from "@/api/apiClient";
import { useAuth } from "@/auth/auth-context";
import { Book } from "@/lib/definitions";
import { CurrentShelfContext } from "@/context/current-shelf-provider";
import BookSearchResultList from "@/components/book-search-result-list";
import { useLocalSearchParams } from "expo-router";

export default function SearchBooksScreen() {
  const { shelfId } = useLocalSearchParams<{
    shelfId: string;
  }>();
  const [title, setTitle] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const { theme } = useTheme();
  const { accessToken } = useAuth();

  async function handleSearchPress() {
    setBooks(await searchBooks(accessToken, title));
  }

  return (
    <CurrentShelfContext.Provider value={shelfId}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TextInput
          placeholder="title"
          value={title}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.inputText,
            },
          ]}
          onChangeText={setTitle}
        />
        <ThemedPressable variant="primary" onPress={handleSearchPress}>
          <Text style={{ color: theme.text }}>search</Text>
        </ThemedPressable>
        {!!books.length && (
          <BookSearchResultList books={books}></BookSearchResultList>
        )}
      </View>
    </CurrentShelfContext.Provider>
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
    margin: 16,
    height: 50,
    width: 150,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
});
