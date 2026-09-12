import ReadingProgressItem from "@/components/reading-progress-item";
import { ReadingProgress } from "@/storage/reading";
import { View } from "react-native";

interface ReadingProgressListProps {
  progressList: ReadingProgress[];
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
