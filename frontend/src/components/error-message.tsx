import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/theme-provider";
import ThemedPressable from "@/components/themed-pressable";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

/**
 * The app's inline error surface. Uses the existing `theme.errorText` idiom already established
 * in `register.tsx`; there is deliberately no global toast or snackbar.
 */
export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.message, { color: theme.errorText }]}>{message}</Text>
      {onRetry && (
        <ThemedPressable
          variant="secondary"
          text="try again"
          onPress={onRetry}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  message: {
    textAlign: "center",
    marginVertical: 8,
  },
});
