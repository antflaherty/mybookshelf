import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import { useEffect, useState } from "react";
import { getReviews } from "@/api/apiClient";
import { BookDetails, Review } from "@/lib/definitions";
import StarRating from "@/components/star-rating";
import { useBook } from "@/hooks/book";
import BookHeader from "@/components/book-header";

export default function ReviewsScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookDetails, setBookDetails] = useState<BookDetails | undefined>();
  const { theme } = useTheme();
  const { accessToken } = useAuth();
  const { getBookDetails } = useBook();

  useEffect(() => {
    async function load() {
      if (bookId) {
        const reviews = await getReviews(accessToken, bookId);
        const bookDetails = await getBookDetails(bookId);

        setReviews(reviews || []);
        setBookDetails(bookDetails);
      }
    }

    load();
  }, [bookId, accessToken, getBookDetails]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
