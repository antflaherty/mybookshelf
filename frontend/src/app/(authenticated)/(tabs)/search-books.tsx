import { useTheme } from "@/theme/theme-provider";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useRef, useState } from "react";
import ThemedPressable from "@/components/themed-pressable";
import { searchBooks } from "@/api/apiClient";
import { useAuth } from "@/auth/auth-context";
import { Book } from "@/lib/definitions";
import { CurrentShelfContext } from "@/context/current-shelf-provider";
import BookSearchResultList from "@/components/book-search-result-list";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

export default function SearchBooksScreen() {
  const { shelfId } = useLocalSearchParams<{
    shelfId: string;
  }>();
  const [title, setTitle] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const { accessToken } = useAuth();

  async function handleSearchPress() {
    setIsLoading(true);
    const searchBookResult = await searchBooks(accessToken, title);
    setBooks(searchBookResult);
    setIsLoading(false);
  }

  const preserveSearch = useRef(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!preserveSearch.current) {
          setTitle("");
          setBooks([]);
        }

        preserveSearch.current = false;
      };
    }, []),
  );

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
        <View
          style={{
            height: "70%",
            justifyContent: "center",
          }}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.loading} size="large" />
          ) : (
            !!books.length && (
              <BookSearchResultList
                books={books}
                onBookSelected={() => {
                  preserveSearch.current = true;
                }}
              ></BookSearchResultList>
            )
          )}
        </View>
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
