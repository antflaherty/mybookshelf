import { Book, Bookmark } from "@/lib/definitions";
import { useTheme } from "@/theme/theme-provider";
import { Text, View } from "react-native";

interface BookmarkItemProps {
  progressItem: Book & Bookmark;
}

export default function BookmarkItem({ progressItem }: BookmarkItemProps) {
  const { theme } = useTheme();

  return (
    <View>
      <Text style={{ color: theme.text }}>
        {progressItem.title}: {progressItem.currentPage} /{" "}
        {progressItem.pageCount}
      </Text>
    </View>
  );
}
