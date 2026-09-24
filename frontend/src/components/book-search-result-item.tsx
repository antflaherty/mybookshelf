import { Book } from "@/lib/definitions";
import { useTheme } from "@/theme/theme-provider";
import { Text, View, StyleSheet } from "react-native";

interface BookSearchResultItemProps {
  book: Book;
}

export default function BookSearchResultItem({
  book,
}: BookSearchResultItemProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Text style={{ color: theme.text, fontWeight: "bold" }}>
        {book.title}
      </Text>
      <Text style={{ color: theme.text, fontStyle: "italic" }}>
        {book.author}
      </Text>
    </View>
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
