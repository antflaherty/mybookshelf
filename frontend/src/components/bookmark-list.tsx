import BookmarkItem from "@/components/bookmark-item";
import { Bookmark } from "@/lib/definitions";
import { View } from "react-native";

interface BookmarkListProps {
  bookmarks: Bookmark[];
}

export default function BookmarkList({ bookmarks }: BookmarkListProps) {
  return (
    <View>
      {bookmarks.map((bookmark) => (
        <BookmarkItem key={bookmark.book.id} bookmark={bookmark}></BookmarkItem>
      ))}
    </View>
  );
}
