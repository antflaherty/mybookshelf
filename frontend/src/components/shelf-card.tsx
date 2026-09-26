import { Shelf } from "@/lib/definitions";
import { useTheme } from "@/theme/theme-provider";
import { View, Text, StyleSheet } from "react-native";
import BookmarkList from "./bookmark-list";

interface ShelfCardProps {
  shelf: Shelf;
}

export default function ShelfCard({ shelf }: ShelfCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Text style={{ color: theme.text, fontWeight: "bold" }}>
        {shelf.name}
      </Text>
      <BookmarkList bookmarks={shelf.bookmarks}></BookmarkList>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
    maxWidth: 400,
    padding: 20,
    borderRadius: 16,
    margin: 5,
  },
});
