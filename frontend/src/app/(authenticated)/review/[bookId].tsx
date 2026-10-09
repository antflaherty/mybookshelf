import { postReview } from "@/api/apiClient";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import ThemedPressable from "@/components/themed-pressable";
import { BookDetails } from "@/lib/definitions";
import BookHeader from "@/components/book-header";
import StarRating from "@/components/star-rating";
import { useBook } from "@/hooks/book";
import ErrorMessage from "@/components/error-message";
import { useAsyncAction } from "@/hooks/use-async-action";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

export default function ReviewBookScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookDetails, setBookDetails] = useState<BookDetails | undefined>(
    undefined,
  );
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  const { theme } = useTheme();

  const { accessToken } = useAuth();
  const { getBookDetails } = useBook();

  const { run: runSubmit, error: submitError } = useAsyncAction(() =>
    postReview(accessToken, {
      bookId,
      stars,
      comment,
      timestamp: new Date().toISOString(),
    }),
  );

  useEffect(() => {
    async function load() {
      if (!bookId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const details = await getBookDetails(bookId);

        setBookDetails(details);
      } catch (caught) {
        setError(
          caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE,
        );
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [bookId, getBookDetails]);

  async function handleSubmit() {
    const result = await runSubmit();

    // Previously this navigated home unconditionally, so a failed save looked like it worked.
    if (result.ok) {
      router.push("/");
    }
  }

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.loading} size="large"></ActivityIndicator>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
    >
      {bookDetails && (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.background,
            width: "100%",
          }}
        >
          <View style={{ flex: 2 }}>
            <BookHeader book={bookDetails.book} readOnly></BookHeader>
          </View>
          <View style={{ flex: 3, width: "100%", alignItems: "center" }}>
            <StarRating rating={stars} onChange={setStars} />
            <TextInput
              multiline
              numberOfLines={5}
              placeholder="write a review..."
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
              style={[
                styles.commentInput,
                {
                  backgroundColor: theme.inputBackground,
                  color: theme.inputText,
                },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            {submitError && <ErrorMessage message={submitError} />}
            <ThemedPressable text="submit" onPress={handleSubmit} />
          </View>
        </View>
      )}
      {!bookDetails && error && <ErrorMessage message={error} />}
    </View>
  );
}

const styles = StyleSheet.create({
  commentInput: {
    width: "80%",
    minHeight: 140,
    padding: 10,
    borderRadius: 10,
    margin: 10,
  },
});
