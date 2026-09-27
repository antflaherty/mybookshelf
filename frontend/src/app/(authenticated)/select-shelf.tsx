import { useTheme } from "@/theme/theme-provider";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useShelf } from "@/context/shelf-provider";
import ShelfView from "@/components/shelf-card";
import { useAuth } from "@/auth/auth-context";
import { placeBookmark } from "@/api/apiClient";

export default function SelectShelfScreen() {
  const { bookId, currentPage } = useLocalSearchParams<{
    bookId: string;
    currentPage: string;
  }>();

  const { theme } = useTheme();
  const { accessToken } = useAuth();
  const { shelves, loadShelves } = useShelf();

  function createShelfPressHandler(shelfId: string) {
    return async () => {
      const placeBookmarkRequest = {
        bookId,
        currentPage: Number(currentPage),
        shelfId,
      };

      await placeBookmark(accessToken, placeBookmarkRequest);
      await loadShelves();

      router.push("/");
    };
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {shelves.map((shelf) => (
        <Pressable
          style={{ width: "100%", alignItems: "center" }}
          key={shelf.id}
          onPress={createShelfPressHandler(shelf.id)}
        >
          <ShelfView shelf={shelf}></ShelfView>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
