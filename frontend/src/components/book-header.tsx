import { useTheme } from "@/theme/theme-provider";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Book } from "@/lib/definitions";
import BookCover from "./book-cover";
import { useState } from "react";
import AntDesign from "@react-native-vector-icons/ant-design";

interface BookHeaderProps {
  book: Book;
  onPageCountChange?: (pageCount: number) => void;
  readOnly?: boolean;
}

export default function BookHeader({
  book,
  onPageCountChange,
  readOnly = false,
}: BookHeaderProps) {
  const { theme } = useTheme();

  const [pageCount, setPageCount] = useState(`${book.pageCount}`);
  const [isEditingPageCount, setIsEditingPageCount] = useState(false);

  function handlePageCountChange(value: string) {
    setPageCount(value);
    onPageCountChange?.(parseInt(value));
  }

  return (
    <View style={styles.container}>
      <Text style={{ color: theme.text, fontWeight: "bold" }}>
        {book.title}
      </Text>
      <Text style={{ color: theme.text, fontStyle: "italic" }}>
        {book.author}
      </Text>

      <BookCover uri={book.coverUri}></BookCover>
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
            onChangeText={handlePageCountChange}
          />
          {!readOnly && (
            <Pressable
              onPress={() => {
                setIsEditingPageCount(false);
              }}
            >
              <AntDesign name="check" style={{ color: theme.text }}></AntDesign>
            </Pressable>
          )}
        </View>
      ) : (
        <Text style={{ color: theme.text }}>
          {pageCount} pages{" "}
          {!readOnly && (
            <Pressable
              onPress={() => {
                setIsEditingPageCount(true);
              }}
            >
              <AntDesign name="edit" style={{ color: theme.text }}></AntDesign>
            </Pressable>
          )}
        </Text>
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
