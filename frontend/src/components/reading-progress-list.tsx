import BookmarkItem from "@/components/reading-progress-item";
import { Book, Bookmark } from "@/lib/definitions";
import { View } from "react-native";

interface BookmarkListProps {
  progressList: (Book & Bookmark)[];
}

export default function BookmarkList({ progressList }: BookmarkListProps) {
  return (
    <View>
      {progressList.map((progressItem) => (
        <BookmarkItem
          key={progressItem.title}
          progressItem={progressItem}
        ></BookmarkItem>
      ))}
    </View>
  );
}
