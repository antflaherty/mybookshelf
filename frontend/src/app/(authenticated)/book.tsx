import { useTheme } from "@/theme/theme-provider";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/auth/auth-context";
import { useShelf } from "@/context/shelf-provider";
import { Book, BookDetails } from "@/lib/definitions";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { createBook, placeBookmark, getBookDetails } from "@/api/apiClient";
import { useCallback, useState } from "react";
import BookActions from "@/components/book-actions";
import BookHeader from "@/components/book-header";
import GenrePill from "@/components/genre-pill";

export default function BookScreen() {
  const { book: bookParam, shelfId } = useLocalSearchParams<{
    book: string;
    shelfId: string;
  }>();
  const book: Book = JSON.parse(bookParam);

  const { shelves, toBeRead, currentlyReading, finished, loadShelves } =
    useShelf();

  const bookmark = shelves
    .map((shelf) =>
      shelf.bookmarks.find((bookmark) => bookmark.book.id === book.id),
    )
    .find((bookmark) => bookmark !== undefined);

  const shelfName = shelves.find(({ id }) => id === shelfId)?.name;

  const [pageCount, setPageCount] = useState(
    bookmark?.book.pageCount || book.pageCount,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [bookDetails, setBookDetails] = useState<BookDetails | undefined>(
    undefined,
  );

  const { theme } = useTheme();
  const { accessToken } = useAuth();

  useFocusEffect(
    useCallback(() => {
      async function loadBookDetails() {
        setIsLoading(true);
        const bookDetails = await getBookDetails(accessToken, book.id);
        setBookDetails(bookDetails);
        setIsLoading(false);
      }
      loadBookDetails();
    }, [accessToken, book]),
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
    const bookWithId = await createBook(accessToken, {
      ...book,
      pageCount,
    });

    if (shelfId) {
      const placeBookmarkRequest = {
        bookId: bookWithId.id,
        currentPage: 0,
        shelfId: shelfId,
      };
      await placeBookmark(accessToken, placeBookmarkRequest);
      await loadShelves();

      router.push("/");
      return;
    }

    router.push({
      pathname: "/select-shelf",
      params: {
        bookId: bookWithId.id,
        currentPage: 0,
      },
    });
  }

  async function handleStartReading() {
    let bookId;
    if (!bookmark) {
      const bookWithId = await createBook(accessToken, {
        ...book,
        pageCount,
      });
      bookId = bookWithId.id;
    } else {
      bookId = bookmark.book.id;
    }

    const placeBookmarkRequest = {
      bookId,
      currentPage: 0,
      shelfId: currentlyReading.id,
    };
    await placeBookmark(accessToken, placeBookmarkRequest);

    await loadShelves();

    router.push({
      pathname: "/place-bookmark",
      params: {
        bookmark: JSON.stringify({ currentPage: 0, book }),
      },
    });
  }

  const showAddToShelf = !bookmark;
  const showStartReading = !bookmark || bookmark.shelfId === toBeRead.id;
  const showPlaceBookmark =
    !!bookmark && shelfId !== toBeRead.id && shelfId !== finished.id;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.bookHeader}>
        <BookHeader book={book} onPageCountChange={setPageCount} />
      </View>
      <View style={styles.bookDetails}>
        {isLoading ? (
          <ActivityIndicator
            color={theme.loading}
            size="large"
          ></ActivityIndicator>
        ) : (
          bookDetails && (
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
          )
        )}
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
