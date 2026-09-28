import { Book } from "@/lib/definitions";
import { ActivityIndicator, FlatList, View } from "react-native";
import BookSearchResultItem from "./book-search-result-item";

interface BookSearchResultListProps {
  books: Book[];
  isLoadingMore: boolean;
  onBookSelected?: () => void;
  onEndReached: () => Promise<void>;
}

export default function BookSearchResultList({
  books,
  isLoadingMore,
  onBookSelected,
  onEndReached,
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
          <BookSearchResultItem
            book={item}
            onBookSelected={onBookSelected}
          ></BookSearchResultItem>
        )}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
      />
    </View>
  );
}
