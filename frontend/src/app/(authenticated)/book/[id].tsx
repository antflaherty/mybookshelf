import { useTheme } from "@/theme/theme-provider";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useShelf } from "@/context/shelf-provider";
import { BookDetails } from "@/lib/definitions";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import BookActions from "@/components/book-actions";
import BookHeader from "@/components/book-header";
import GenrePill from "@/components/genre-pill";
import { useBookActions } from "@/hooks/book-actions";
import ThemedPressable from "@/components/themed-pressable";
import { useBook } from "@/hooks/book";

export default function BookScreen() {
  const { id, shelfId } = useLocalSearchParams<{
    id: string;
    shelfId: string;
  }>();

  const { getBookDetails } = useBook();

  const { shelves, toBeRead, finished } = useShelf();

  const bookmark = shelves
    .map((shelf) => shelf.bookmarks.find((bookmark) => bookmark.book.id === id))
    .find((bookmark) => bookmark !== undefined);

  const shelfName = shelves.find(({ id }) => id === shelfId)?.name;

  const [isLoading, setIsLoading] = useState(true);
  const [bookDetails, setBookDetails] = useState<BookDetails | undefined>(
    undefined,
  );
  const [pageCount, setPageCount] = useState(
    bookmark?.book.pageCount || bookDetails?.book.pageCount || 0,
  );

  const { theme } = useTheme();
  const { addNewBookToShelf, startReading } = useBookActions();

  useFocusEffect(
    useCallback(() => {
      async function loadBookDetails() {
        setIsLoading(true);
        const bookDetails = await getBookDetails(id);
        setBookDetails(bookDetails);
        setIsLoading(false);
      }
      loadBookDetails();
    }, [id, getBookDetails]),
  );

  function handlePlaceBookmark() {
    return Promise.resolve(
      router.push({
        pathname: "/place-bookmark",
        params: {
          bookmark: JSON.stringify(bookmark),
        },
      }),
    );
  }

  async function handleAddToShelf() {
    if (!bookDetails?.book) {
      return;
    }

    addNewBookToShelf({ ...bookDetails.book, pageCount }, shelfId);

    if (shelfId) {
      router.push("/");
      return;
    }

    router.push({
      pathname: "/select-shelf",
      params: {
        bookId: id,
        currentPage: 0,
      },
    });
  }

  async function handleStartReading() {
    if (!bookDetails?.book) {
      return;
    }

    await startReading({ ...bookDetails.book, pageCount }, bookmark);

    router.push({
      pathname: "/place-bookmark",
      params: {
        bookmark: JSON.stringify({ currentPage: 0, book: bookDetails.book }),
      },
    });
  }

  const showAddToShelf = !bookmark;
  const showStartReading = !bookmark || bookmark.shelfId === toBeRead.id;
  const showPlaceBookmark =
    !!bookmark && shelfId !== toBeRead.id && shelfId !== finished.id;

  return isLoading ? (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, justifyContent: "center" },
      ]}
    >
      <ActivityIndicator color={theme.loading} size="large"></ActivityIndicator>
    </View>
  ) : (
    bookDetails && (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.bookHeader}>
          <BookHeader
            book={bookDetails.book}
            onPageCountChange={setPageCount}
          />
        </View>
        <View style={styles.bookDetails}>
          <View style={{ height: "100%" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {bookDetails?.genres.map((genre) => (
                <GenrePill key={genre} genre={genre}></GenrePill>
              ))}
            </View>
            <ScrollView>
              <Text style={{ color: theme.text }}> {bookDetails.blurb}</Text>
            </ScrollView>
          </View>
        </View>
        <View style={styles.bookActions}>
          <BookActions
            showAddToShelf={showAddToShelf}
            showPlaceBookmark={showPlaceBookmark}
            showStartReading={showStartReading}
            onAddToShelf={handleAddToShelf}
            onPlaceBookmark={handlePlaceBookmark}
            onStartReading={handleStartReading}
            shelfName={shelfName}
          />
          <ThemedPressable
            variant="secondary"
            onPress={() => {
              router.push({
                pathname: "/reviews/[bookId]",
                params: { bookId: id },
              });
            }}
            text="reviews"
          />
        </View>
      </View>
    )
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bookHeader: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bookDetails: {
    flex: 3,
  },
  bookActions: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
