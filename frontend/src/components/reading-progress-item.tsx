import { Book, Bookmark } from "@/lib/definitions";
import { useTheme } from "@/theme/theme-provider";
import { Text, View } from "react-native";

interface BookmarkItemProps {
  bookmark: Book & Bookmark;
}

export default function BookmarkItem({ bookmark }: BookmarkItemProps) {
  const { theme } = useTheme();

  return (
    <View>
      <Text style={{ color: theme.text }}>
        {bookmark.title}: {bookmark.currentPage} / {bookmark.pageCount}
      </Text>
    </View>
  );
}
