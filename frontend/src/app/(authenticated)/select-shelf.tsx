import { useTheme } from "@/theme/theme-provider";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useShelf } from "@/context/shelf-provider";
import ShelfView from "@/components/shelf-card";
import { useAuth } from "@/auth/auth-context";
import { placeBookmark } from "@/api/apiClient";
import ErrorMessage from "@/components/error-message";
import { useAsyncAction } from "@/hooks/use-async-action";

export default function SelectShelfScreen() {
  const { bookId, currentPage } = useLocalSearchParams<{
    bookId: string;
    currentPage: string;
  }>();

  const { theme } = useTheme();
  const { accessToken } = useAuth();
  const { shelves, loadShelves } = useShelf();

  // One action, one error. The handler used to be built per shelf in a loop; giving each button
  // its own state would mean a failure on one shelf leaving the others looking healthy.
  const { run, error } = useAsyncAction(async (shelfId: string) => {
    await placeBookmark(accessToken, {
      bookId,
      currentPage: Number(currentPage),
      shelfId,
    });
    await loadShelves();
  });

  function createShelfPressHandler(shelfId: string) {
    return async () => {
      const result = await run(shelfId);

      // Only navigate when the bookmark actually landed. This previously navigated home even
      // after both the save and the refresh had failed.
      if (result.ok) {
        router.push("/");
      }
    };
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {error && <ErrorMessage message={error} />}
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
