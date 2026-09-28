import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import { useEffect, useState } from "react";
import { getReviews } from "@/api/apiClient";
import { Review } from "@/lib/definitions";

export default function ReviewsScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const { theme } = useTheme();
  const { accessToken } = useAuth();

  useEffect(() => {
    async function load() {
      if (bookId) {
        const reviews = await getReviews(accessToken, bookId);

        setReviews(reviews);
      }
    }

    load();
  }, [bookId, accessToken]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {reviews.map((review) => (
        <Text key={review.userId}>
          {review.stars / 4} stars {review.comment ? `| ${review.comment}` : ""}
        </Text>
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
