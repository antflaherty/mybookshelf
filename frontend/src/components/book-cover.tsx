import { Image } from "react-native";
import { useEffect, useState } from "react";

interface BookCoverProps {
  uri: string;
  width?: number;
}

export default function BookCover({ uri, width = 120 }: BookCoverProps) {
  const [aspectRatio, setAspectRatio] = useState(2 / 3);

  useEffect(() => {
    Image.getSize(
      uri,
      (imageWidth, imageHeight) => {
        setAspectRatio(imageWidth / imageHeight);
      },
      (error) => {
        console.error("Failed to get book cover dimensions:", error);
      },
    );
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={[
        {
          width,
          aspectRatio,
        },
      ]}
    />
  );
}
