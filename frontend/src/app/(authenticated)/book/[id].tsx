import { useTheme } from "@/theme/theme-provider";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useShelf } from "@/context/shelf-provider";
import { Book, BookDetails } from "@/lib/definitions";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import BookActions from "@/components/book-actions";
import BookHeader from "@/components/book-header";
import GenrePill from "@/components/genre-pill";
import { useBookActions } from "@/hooks/book-actions";
import ThemedPressable from "@/components/themed-pressable";
import { useBook } from "@/hooks/book";
import ErrorMessage from "@/components/error-message";
import { useAsyncAction } from "@/hooks/use-async-action";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

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
  const [error, setError] = useState<string | null>(null);
  const [bookDetails, setBookDetails] = useState<BookDetails | undefined>(
    undefined,
  );
  const [pageCount, setPageCount] = useState(
    bookmark?.book.pageCount || bookDetails?.book.pageCount || 0,
  );

  const { theme } = useTheme();
  const { addNewBookToShelf, startReading } = useBookActions();

  // The book is passed in rather than read from state, so neither action needs a non-null
  // assertion on `bookDetails`.
  const {
    run: runAddToShelf,
    error: actionError,
  } = useAsyncAction((book: Book) => {
    return addNewBookToShelf({ ...book, pageCount }, shelfId);
  });

  const { run: runStartReading, error: startReadingError } = useAsyncAction(
    (book: Book) => {
      return startReading({ ...book, pageCount }, bookmark);
    },
  );

  const shownError = error ?? actionError ?? startReadingError;

  useFocusEffect(
    useCallback(() => {
      async function loadBookDetails() {
        setIsLoading(true);
        setError(null);

        try {
          const details = await getBookDetails(id);

          setBookDetails(details);
          setPageCount((current) => current || details.book.pageCount);
        } catch (caught) {
          // Without this the screen stays a spinner forever, and the `bookDetails &&` below
          // would render nothing at all.
          setError(
            caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE,
          );
        } finally {
          setIsLoading(false);
        }
      }
      loadBookDetails();
    }, [id, getBookDetails]),
  );

  function handlePlaceBookmark() {
    return Promise.resolve(
      router.push({
        pathname: "/place-bookmark",
        params: {
          bookId: id,
          currentPage: String(bookmark?.currentPage ?? 0),
        },
      }),
    );
  }

  async function handleAddToShelf() {
    if (!bookDetails?.book) {
      return;
    }

    const result = await runAddToShelf(bookDetails.book);

    // Awaited, and only navigate on success. This previously fired the save without awaiting
    // and navigated immediately, so a failed save looked like it worked.
    if (!result.ok) {
      return;
    }

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

    const result = await runStartReading(bookDetails.book);

    if (!result.ok) {
      return;
    }

    router.push({
      pathname: "/place-bookmark",
      params: {
        bookId: id,
        currentPage: "0",
      },
    });
  }

  const showAddToShelf = !bookmark;
  // Undefined means the named shelves are not loaded. Hiding the action is the right response:
  // we cannot place a bookmark on a shelf we do not have an id for.
  const showStartReading = !bookmark || bookmark.shelfId === toBeRead?.id;
  const showPlaceBookmark =
    !!bookmark &&
    !!toBeRead &&
    !!finished &&
    shelfId !== toBeRead.id &&
    shelfId !== finished.id;

  return isLoading ? (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, justifyContent: "center" },
      ]}
    >
      <ActivityIndicator color={theme.loading} size="large"></ActivityIndicator>
    </View>
  ) : !bookDetails ? (
    // The load failed. Previously this fell through the `bookDetails &&` below and rendered
    // nothing at all.
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, justifyContent: "center" },
      ]}
    >
      <ErrorMessage
        message={shownError ?? GENERIC_ERROR_MESSAGE}
        onRetry={() => router.push({ pathname: "/book/[id]", params: { id } })}
      />
    </View>
  ) : (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {shownError && <ErrorMessage message={shownError} />}
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
            {bookDetails.genres.map((genre) => (
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
