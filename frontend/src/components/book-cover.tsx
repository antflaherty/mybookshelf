import { Image, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { useTheme } from "@/theme/theme-provider";

interface BookCoverProps {
  uri?: string;
  width?: number;
}

export default function BookCover({ uri, width = 120 }: BookCoverProps) {
  const [aspectRatio, setAspectRatio] = useState(2 / 3);
  const [hasError, setHasError] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (uri) {
      Image.getSize(
        uri,
        (imageWidth, imageHeight) => {
          setAspectRatio(imageWidth / imageHeight);
        },
        (error) => {
          console.error("Failed to get book cover dimensions:", error);
          setHasError(true);
        },
      );
    }
  }, [uri]);

  return hasError || !uri ? (
    <View style={{ width, aspectRatio, backgroundColor: theme.surface }}>
      <Text style={{ color: theme.text }}>cover not found</Text>
    </View>
  ) : (
    <Image
      source={{ uri }}
      style={[
        {
          width,
          aspectRatio,
        },
      ]}
      onError={() => {
        setHasError(true);
      }}
    />
  );
}
