import { useTheme } from "@/theme/theme-provider";
import { View, Text } from "react-native";

interface GenrePillProps {
  genre: string;
}

export default function GenrePill({ genre }: GenrePillProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 20,
        margin: 5,
        padding: 10,
      }}
    >
      <Text style={{ color: theme.text }}>{genre}</Text>
    </View>
  );
}
