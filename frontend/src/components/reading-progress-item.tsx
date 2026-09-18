import { ReadingProgress } from "@/storage/reading";
import { Text, View } from "react-native";

interface ReadingProgressItemProps {
  progressItem: ReadingProgress;
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
