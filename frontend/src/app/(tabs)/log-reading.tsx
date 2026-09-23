import { getBooks, logBookmark } from "@/api/apiClient";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import * as z from "zod";
import { Dropdown } from "react-native-element-dropdown";
import { Book } from "@/lib/definitions";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import ThemedPressable from "@/components/themed-pressable";

const BookmarkSchema = z.object({
  id: z.string().min(1),
  currentPage: z.coerce.number().min(1),
});

export default function LogReadingModalScreen() {
  const [books, setBooks] = useState<Book[]>([]);

  const [id, setId] = useState("");
  const [currentPage, setCurrentPage] = useState("");

  const [titleError, setTitleError] = useState("");
  const [currentPageError, setCurrentPageError] = useState("");

  const { theme } = useTheme();

  const { accessToken } = useAuth();

  const bookDropdownData = books.map((book) => {
    return { value: book.id, label: book.title };
  });

  async function loadAllBooks() {
    const data = await getBooks(accessToken);
    setBooks(data);
  }

  useFocusEffect(
    useCallback(() => {
      loadAllBooks();
    }, []),
  );

  function clearAndGoBack() {
    setId("");
    setCurrentPage("");
    clearErrors();
    router.back();
  }

  function clearErrors() {
    setTitleError("");
    setCurrentPageError("");
  }

  function handleCancelPress() {
    clearAndGoBack();
  }

  async function handleSubmitPress() {
    try {
      clearErrors();

      const rawBookmark = {
        id,
        currentPage,
      };

      const bookmark = BookmarkSchema.parse(rawBookmark);

      await logBookmark(accessToken, bookmark);

      Alert.alert("Reading Logged!");

      clearAndGoBack();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(error);
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
      }
    }
  }
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text }}>Log Some Reading</Text>
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
      <View style={{ flexDirection: "row" }}>
        <ThemedPressable variant="primary" onPress={handleSubmitPress}>
          <Text style={{ color: theme.text }}>Submit</Text>
        </ThemedPressable>
        <ThemedPressable variant="secondary" onPress={handleCancelPress}>
          <Text style={{ color: theme.text }}>Cancel</Text>
        </ThemedPressable>
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
