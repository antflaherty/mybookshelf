import { Book } from "@/lib/definitions";
import { FlatList, View } from "react-native";
import BookSearchResultItem from "./book-search-result-item";

interface BookSearchResultListProps {
  books: Book[];
}

export default function BookSearchResultList({
  books,
}: BookSearchResultListProps) {
  return (
    <View
      style={{
        flex: 1,
        width: "80%",
      }}
    >
      <FlatList
        contentContainerStyle={{
          width: "100%",
        }}
        data={books}
        keyExtractor={(book) => book.id}
        renderItem={({ item }) => (
          <BookSearchResultItem book={item}></BookSearchResultItem>
        )}
      />
    </View>
  );
}
