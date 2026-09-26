import { Book } from "@/lib/definitions";
import { useTheme } from "@/theme/theme-provider";
import { useCurrentShelf } from "@/context/current-shelf-provider";
import { router } from "expo-router";
import { Text, View, StyleSheet, Pressable } from "react-native";

interface BookSearchResultItemProps {
  book: Book;
}

export default function BookSearchResultItem({
  book,
}: BookSearchResultItemProps) {
  const { theme } = useTheme();
  const shelfId = useCurrentShelf();

  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname: "/book",
          params: {
            book: JSON.stringify(book),
            shelfId,
          },
        });
      }}
    >
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={{ color: theme.text, fontWeight: "bold" }}>
          {book.title}
        </Text>
        <Text style={{ color: theme.text, fontStyle: "italic" }}>
          {book.author}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    maxWidth: 400,
    width: "100%",
    padding: 20,
    borderRadius: 16,
    margin: 2,
  },
});
