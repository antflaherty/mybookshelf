import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import { useEffect, useState } from "react";
import { getReviews } from "@/api/apiClient";
import { BookDetails, Review } from "@/lib/definitions";
import StarRating from "@/components/star-rating";
import { useBook } from "@/hooks/book";
import BookHeader from "@/components/book-header";
import ErrorMessage from "@/components/error-message";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

export default function ReviewsScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookDetails, setBookDetails] = useState<BookDetails | undefined>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { accessToken } = useAuth();
  const { getBookDetails } = useBook();

  useEffect(() => {
    async function load() {
      if (!bookId) {
        // Previously returned without clearing loading, leaving a permanent spinner.
        setError("no book selected");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Concurrent, not sequential: the old `await` then `await` took the slowest possible
      // total latency. Each result is settled independently so a book-details failure still
      // leaves the reviews visible, and vice versa.
      const [reviewsResult, bookDetailsResult] = await Promise.allSettled([
        getReviews(accessToken, bookId),
        getBookDetails(bookId),
      ]);

      if (reviewsResult.status === "fulfilled") {
        setReviews(reviewsResult.value || []);
      }
      if (bookDetailsResult.status === "fulfilled") {
        setBookDetails(bookDetailsResult.value ?? undefined);
      }

      const failure = [reviewsResult, bookDetailsResult].find(
        (r) => r.status === "rejected",
      );

      if (failure?.status === "rejected") {
        setError(
          failure.reason instanceof ApiError
            ? failure.reason.message
            : GENERIC_ERROR_MESSAGE,
        );
      }

      setLoading(false);
    }

    load();
  }, [bookId, accessToken, getBookDetails]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.loading}
        ></ActivityIndicator>
      ) : (
        <View>
          {error && <ErrorMessage message={error} />}
          <View style={{ flex: 1 }}>
            {bookDetails && (
              <BookHeader book={bookDetails.book} readOnly></BookHeader>
            )}
          </View>
          <View style={{ flex: 2 }}>
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <View key={review.userId}>
                  <StarRating rating={review.stars} readonly />
                  {review.comment && (
                    <Text style={{ color: theme.text }}>{review.comment}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={{ color: theme.text }}>no reviews yet.</Text>
            )}
          </View>
        </View>
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
