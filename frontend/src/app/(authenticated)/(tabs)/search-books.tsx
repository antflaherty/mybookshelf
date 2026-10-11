import { useTheme } from "@/theme/theme-provider";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { useCallback, useRef, useState } from "react";
import ThemedPressable from "@/components/themed-pressable";
import { searchBooks } from "@/api/apiClient";
import { useAuth } from "@/auth/auth-context";
import { Book } from "@/lib/definitions";
import { CurrentShelfContext } from "@/context/current-shelf-provider";
import BookList from "@/components/book-search-result-list";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import ErrorMessage from "@/components/error-message";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

const SEARCH_LIMIT = 6;

export default function SearchBooksScreen() {
  const { shelfId } = useLocalSearchParams<{
    shelfId: string;
  }>();
  const [title, setTitle] = useState("");
  // Mirrors `title`, because a pagination response must be checked against the query that is
  // current *when it lands*, and a closure would only ever see the value from when it started.
  const titleRef = useRef("");
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { accessToken } = useAuth();

  function messageFor(caught: unknown) {
    return caught instanceof ApiError
      ? caught.message
      : GENERIC_ERROR_MESSAGE;
  }

  function handleTitleChange(text: string) {
    titleRef.current = text;
    setTitle(text);
  }

  async function handleSearchPress() {
    setHasMore(false);
    setIsLoading(true);
    setError(null);
    setSearchPage(1);

    try {
      const searchBookResult = await searchBooks(
        accessToken,
        title,
        SEARCH_LIMIT,
        1,
      );

      setHasMore(searchBookResult.length >= SEARCH_LIMIT);
      setBooks(searchBookResult);
    } catch (caught) {
      setError(messageFor(caught));
      setBooks([]);
    } finally {
      // Cleared in a `finally`: previously a throw left the spinner running forever.
      setIsLoading(false);
    }
  }

  async function handleResultListEndReached() {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }

    // Captured when the request starts, so a page that lands after the user has moved on can
    // be recognised as belonging to a previous query.
    const query = titleRef.current;

    setIsLoadingMore(true);
    setError(null);

    try {
      const searchBookResult = await searchBooks(
        accessToken,
        query,
        SEARCH_LIMIT,
        searchPage + 1,
      );

      if (query !== titleRef.current) {
        // The query changed while page N was in flight. Appending these results would mix two
        // searches together, and bumping the page would corrupt the new search's pagination.
        return;
      }

      setHasMore(searchBookResult.length >= SEARCH_LIMIT);

      setBooks((current) => [...current, ...searchBookResult]);
      setSearchPage((current) => current + 1);
    } catch (caught) {
      // Deliberately leaves `books` and `hasMore` alone. A user looking at 20 results should not
      // lose them because page 2 timed out, and leaving `hasMore` true lets them retry the page.
      if (query === titleRef.current) {
        setError(messageFor(caught));
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  const preserveSearch = useRef(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!preserveSearch.current) {
          titleRef.current = "";
          setTitle("");
          setBooks([]);
          setSearchPage(1);
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
          onChangeText={handleTitleChange}
        />
        <ThemedPressable
          variant="primary"
          text="search"
          onPress={handleSearchPress}
        />
        <View
          style={{
            height: "70%",
            justifyContent: "center",
          }}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.loading} size="large" />
          ) : (
            !!error && <ErrorMessage message={error} />
          )}
          {/* Results stay mounted through a pagination failure so page 1 is not lost. */}
          {!isLoading && !!books.length && (
            <BookList
              books={books}
              onBookSelected={() => {
                preserveSearch.current = true;
              }}
              onEndReached={handleResultListEndReached}
              isLoadingMore={isLoadingMore}
            ></BookList>
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
