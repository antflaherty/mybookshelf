import { Book, ReadingProgress } from "@/lib/definitions";
import { useTheme } from "@/app/theme";
import { Text, View } from "react-native";

interface ReadingProgressItemProps {
  progressItem: Book & ReadingProgress;
}

export default function ReadingProgressItem({
  progressItem,
}: ReadingProgressItemProps) {
  const { theme } = useTheme();

  return (
    <View>
      <Text style={{ color: theme.textColor }}>
        {progressItem.title}: {progressItem.currentPage} /{" "}
        {progressItem.pageCount}
      </Text>
    </View>
  );
}
