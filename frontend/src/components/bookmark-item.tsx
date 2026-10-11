import { Bookmark } from "@/lib/definitions";
import { useTheme } from "@/theme/theme-provider";
import { Text, View } from "react-native";

interface BookmarkItemProps {
  bookmark: Bookmark;
  showProgress: boolean;
}

export default function BookmarkItem({
  bookmark,
  showProgress,
}: BookmarkItemProps) {
  const { theme } = useTheme();

  const isPercent =
    bookmark.bookType === "audiobook" || bookmark.bookType === "ebook";

  const progressText = isPercent
    ? `: ${Math.round(100 * (bookmark.currentPage / bookmark.book.pageCount))}%`
    : `: ${bookmark.currentPage} / ${bookmark.book.pageCount}`;

  return (
    <View>
      <Text style={{ color: theme.text }}>
        {bookmark.book.title}
        {showProgress && progressText}
      </Text>
    </View>
  );
}
