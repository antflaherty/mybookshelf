import ReadingProgressItem from "@/components/reading-progress-item";
import { Book, ReadingProgress } from "@/lib/definitions";
import { View } from "react-native";

interface ReadingProgressListProps {
  progressList:(Book & ReadingProgress)[];
}

export default function ReadingProgressList({
  progressList,
}: ReadingProgressListProps) {
  return (
    <View>
      {progressList.map((progressItem) => (
        <ReadingProgressItem
          key={progressItem.title}
          progressItem={progressItem}
        ></ReadingProgressItem>
      ))}
    </View>
  );
}
