import BookmarkItem from "@/components/bookmark-item";
import { Bookmark } from "@/lib/definitions";
import { View } from "react-native";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  showProgress?: boolean;
}

export default function BookmarkList({
  bookmarks,
  showProgress = false,
}: BookmarkListProps) {
  return (
    <View>
      {bookmarks.map((bookmark) => (
        <BookmarkItem
          key={bookmark.book.id}
          bookmark={bookmark}
          showProgress={showProgress}
        ></BookmarkItem>
      ))}
    </View>
  );
}
