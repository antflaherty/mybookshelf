import { useTheme } from "@/theme/theme-provider";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ThemedPressable from "@/components/themed-pressable";
import { useAuth } from "@/auth/auth-context";
import { useShelf } from "@/context/shelf-provider";
import { Book, BookDetails } from "@/lib/definitions";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { createBook, placeBookmark, getBookDetails } from "@/api/apiClient";
import { useCallback, useState } from "react";
import AntDesign from "@react-native-vector-icons/ant-design";
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
    `${bookmark?.book.pageCount || book.pageCount}`,
  );
  const [isEditingPageCount, setIsEditingPageCount] = useState(false);
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

  function handlePlaceBookmarkPress() {
    router.push({
      pathname: "/place-bookmark",
      params: {
        bookmark: JSON.stringify(bookmark),
      },
    });
  }

  async function handleAddToShelfPress() {
    const bookWithId = await createBook(accessToken, {
      ...book,
      pageCount: parseInt(pageCount),
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

  async function handleStartReadingPress() {
    let bookId;
    if (!bookmark) {
      const bookWithId = await createBook(accessToken, {
        ...book,
        pageCount: parseInt(pageCount),
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
      <Text style={{ color: theme.text, fontWeight: "bold" }}>
        {book.title}
      </Text>
      <Text style={{ color: theme.text, fontStyle: "italic" }}>
        {book.author}
      </Text>
      {bookDetails && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {bookDetails?.genres.map((genre) => (
            <GenrePill key={genre} genre={genre}></GenrePill>
          ))}
        </View>
      )}
      {isEditingPageCount ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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
          <Pressable
            onPress={() => {
              setIsEditingPageCount(false);
            }}
          >
            <AntDesign name="check" style={{ color: theme.text }}></AntDesign>
          </Pressable>
        </View>
      ) : (
        <Text style={{ color: theme.text }}>
          {pageCount} pages{" "}
          <Pressable
            onPress={() => {
              setIsEditingPageCount(true);
            }}
          >
            <AntDesign name="edit" style={{ color: theme.text }}></AntDesign>
          </Pressable>
        </Text>
      )}

      {isLoading && (
        <ActivityIndicator
          color={theme.loading}
          size="large"
        ></ActivityIndicator>
      )}
      {bookDetails && (
        <View>
          <Text style={{ color: theme.text }}> {bookDetails.blurb}</Text>
          {bookDetails.genres.map((genre) => (
            <Text key={genre} style={{ color: theme.text }}>
              {genre}
            </Text>
          ))}
        </View>
      )}

      {showPlaceBookmark && (
        <ThemedPressable variant="primary" onPress={handlePlaceBookmarkPress}>
          <Text style={{ color: theme.text }}>place bookmark</Text>
        </ThemedPressable>
      )}
      {showAddToShelf && (
        <ThemedPressable variant="primary" onPress={handleAddToShelfPress}>
          <Text
            style={{ color: theme.text }}
          >{`add to ${shelfName || "shelf"}`}</Text>
        </ThemedPressable>
      )}
      {showStartReading && (
        <ThemedPressable
          variant={showAddToShelf ? "secondary" : "primary"}
          onPress={handleStartReadingPress}
        >
          <Text style={{ color: theme.text }}>start reading</Text>
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
