import { postReview } from "@/api/apiClient";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import { useShelf } from "@/context/shelf-provider";
import ThemedPressable from "@/components/themed-pressable";
import { Book } from "@/lib/definitions";
import BookHeader from "@/components/book-header";

export default function ReviewBookScreen() {
  const { book: bookParam } = useLocalSearchParams<{
    book: string;
  }>();

  let book: Book | undefined;
  if (bookParam !== undefined) {
    book = JSON.parse(bookParam);
  }

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  const { theme } = useTheme();

  const { accessToken } = useAuth();

  async function handleSubmit() {}

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.background,
      }}
    >
      {book && (
        <View>
          <View style={{ flex: 2 }}>
            <BookHeader book={book} readOnly></BookHeader>
          </View>
          <View style={{ flex: 3 }}>
            <Text style={{ color: theme.text }}>STARS PLACEHOLDER</Text>
            <TextInput
              multiline
              numberOfLines={5}
              placeholder="write a review..."
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
              style={{
                backgroundColor: theme.inputBackground,
                color: theme.inputText,
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedPressable text="submit" onPress={handleSubmit} />
          </View>
        </View>
      )}
    </View>
  );
}
