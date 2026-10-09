import { useTheme } from "@/theme/theme-provider";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import ThemedPressable from "@/components/themed-pressable";
import { router } from "expo-router";
import { useShelf } from "@/context/shelf-provider";
import ShelfView from "@/components/shelf-card";
import ErrorMessage from "@/components/error-message";

export default function Index() {
  const { theme } = useTheme();

  const {
    shelves,
    isLoading: isLoadingShelves,
    error,
    loadShelves,
  } = useShelf();

  return isLoadingShelves ? (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.loading} size="large" />
    </View>
  ) : (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {error ? (
        <ErrorMessage message={error} onRetry={() => void loadShelves()} />
      ) : (
        <>
          <ThemedPressable
            text="place bookmark"
            onPress={() => router.push("/place-bookmark")}
          />
          {shelves.map((shelf) => (
            <Pressable
              style={{ width: "100%", alignItems: "center" }}
              key={shelf.id}
              onPress={() => {
                router.push({
                  pathname: "/shelf/[id]",
                  params: { id: shelf.id },
                });
              }}
            >
              <ShelfView shelf={shelf}></ShelfView>
            </Pressable>
          ))}
        </>
      )}
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
