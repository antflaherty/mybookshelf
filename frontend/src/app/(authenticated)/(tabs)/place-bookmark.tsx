import { placeBookmark } from "@/api/apiClient";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import * as z from "zod";
import { Dropdown } from "react-native-element-dropdown";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import { useShelf } from "@/context/shelf-provider";
import ThemedPressable from "@/components/themed-pressable";
import ErrorMessage from "@/components/error-message";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

const BookmarkSchema = z.object({
  bookId: z.string().min(1),
  currentPage: z.coerce.number().min(1),
  shelfId: z.string().min(1),
});

export default function PlaceBookmarkScreen() {
  const { bookId, currentPage: currentPageParam } = useLocalSearchParams<{
    bookId: string;
    currentPage: string;
  }>();

  const [id, setId] = useState(bookId || "");
  const [currentPage, setCurrentPage] = useState(currentPageParam || "");

  const [titleError, setTitleError] = useState("");
  const [currentPageError, setCurrentPageError] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { theme } = useTheme();

  const { accessToken } = useAuth();

  const { currentlyReading, finished, loadShelves } = useShelf();

  const bookDropdownData =
    currentlyReading?.bookmarks.map((bm) => {
      return { value: bm.book.id, label: bm.book.title };
    }) || [];

  function clearAndNavigate(navigate: () => void) {
    setId("");
    setCurrentPage("");
    clearErrors();
    navigate();
  }

  function clearErrors() {
    setTitleError("");
    setCurrentPageError("");
    setError(null);
  }

  async function handleBookCompletedPress() {
    if (!id || !currentlyReading) {
      setTitleError("choose a book");
      return;
    }
    if (!finished) {
      setTitleError("finished shelf not available");
      return;
    }
    clearErrors();

    const currentBookmark = currentlyReading.bookmarks.find(
      ({ book }) => book.id === id,
    );

    if (!currentBookmark) {
      // A validation failure, not an exceptional one: the selected book is not on the shelf.
      setTitleError("book not found on shelf");
      return;
    }

    const placeBookMarkRequest = {
      bookId: id,
      currentPage: currentBookmark.book.pageCount,
      shelfId: finished.id,
    };

    try {
      await placeBookmark(accessToken, placeBookMarkRequest);
      await loadShelves();
    } catch (caught) {
      // Had no try/catch at all: a failed save was an unhandled rejection and the screen did
      // nothing.
      setError(
        caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE,
      );
      return;
    }

    clearAndNavigate(() => {
      router.push({
        pathname: "/review/[bookId]",
        params: { bookId: id },
      });
    });
  }

  async function handlePlaceBookmarkPress() {
    if (!currentlyReading) {
      setTitleError("shelves are not available");
      return;
    }
    try {
      clearErrors();

      const rawBookmark = {
        bookId: id,
        currentPage,
        shelfId: currentlyReading.id,
      };

      const bookmark = BookmarkSchema.parse(rawBookmark);

      let navigation = () => {
        router.back();
      };

      const pageCount = currentlyReading.bookmarks.find(
        ({ book: { id: bookId } }) => bookId === id,
      )?.book.pageCount;
      if (finished && pageCount === bookmark.currentPage) {
        bookmark.shelfId = finished.id;
        navigation = () => {
          router.push({
            pathname: "/review/[bookId]",
            params: { bookId: id },
          });
        };
      }

      await placeBookmark(accessToken, bookmark);
      await loadShelves();

      clearAndNavigate(navigation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((issue) => {
          switch (issue.path[0]) {
            case "id":
              setTitleError(issue.message);
              break;
            case "currentPage":
              if (issue.code === "invalid_type") {
                setCurrentPageError("Input must be a positive whole number");
              } else {
                setCurrentPageError(issue.message);
              }
              break;
          }
        });
      } else if (error instanceof ApiError) {
        // Previously the catch only handled zod, so an ApiError from placeBookmark or
        // loadShelves was swallowed and the user saw nothing at all.
        setError(error.message);
      } else {
        // Any other Error may carry a raw driver or network string in its message. Fall back
        // rather than showing it.
        setError(GENERIC_ERROR_MESSAGE);
      }
    }
  }
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text }}>place your bookmark</Text>
      <Dropdown
        style={[
          styles.dropdown,
          {
            backgroundColor: titleError
              ? theme.errorInputBackground
              : theme.inputBackground,
          },
        ]}
        placeholderStyle={{ color: theme.inputText }}
        selectedTextStyle={{ color: theme.inputText }}
        data={bookDropdownData}
        search
        maxHeight={300}
        labelField="label"
        valueField="value"
        searchPlaceholder="Select title"
        value={id}
        onChange={(item: { value: string }) => {
          setId(item.value);
        }}
      />
      {titleError && (
        <Text style={{ color: theme.errorText }}>{titleError}</Text>
      )}
      <TextInput
        keyboardType="numeric"
        placeholder="Current page"
        value={currentPage}
        style={[
          styles.input,
          {
            backgroundColor: currentPageError
              ? theme.errorInputBackground
              : theme.inputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setCurrentPage}
      />
      {currentPageError && (
        <Text style={{ color: theme.errorText }}>{currentPageError}</Text>
      )}
      {error && <ErrorMessage message={error} />}
      <View style={{ flexDirection: "row" }}>
        <ThemedPressable
          variant="primary"
          text="place bookmark"
          onPress={handlePlaceBookmarkPress}
        />
        <ThemedPressable
          variant="secondary"
          text="book completed"
          onPress={handleBookCompletedPress}
        />
      </View>
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
  dropdown: {
    margin: 16,
    height: 50,
    width: 150,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
  input: {
    margin: 16,
    height: 50,
    width: 150,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
});
