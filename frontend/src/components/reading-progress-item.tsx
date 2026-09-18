import { Book, ReadingProgress } from "@/lib/definitions";
import { Text, View } from "react-native";

interface ReadingProgressItemProps {
  progressItem:Book & ReadingProgress;
}

export default function ReadingProgressItem({
  progressItem,
}: ReadingProgressItemProps) {
  return (
    <View>
      <Text>
        {progressItem.title}: {progressItem.currentPage} /{" "}
        {progressItem.pageCount}
      </Text>
    </View>
  );
}
