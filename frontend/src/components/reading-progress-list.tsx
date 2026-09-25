import BookmarkItem from "@/components/reading-progress-item";
import { Book, Bookmark } from "@/lib/definitions";
import { View } from "react-native";

interface BookmarkListProps {
  bookmarks: (Book & Bookmark)[];
}

export default function BookmarkList({ bookmarks }: BookmarkListProps) {
  return (
    <View>
      {bookmarks.map((bookmark) => (
        <BookmarkItem key={bookmark.id} bookmark={bookmark}></BookmarkItem>
      ))}
    </View>
  );
}
