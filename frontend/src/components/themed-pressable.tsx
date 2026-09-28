import { ComponentProps } from "react";
import { Pressable, Text } from "react-native";
import { useTheme } from "@/theme/theme-provider";

type ThemedPressableProps = ComponentProps<typeof Pressable> & {
  variant?: "primary" | "secondary";
  text: string;
};

export default function ThemedPressable({
  variant = "primary",
  text,
  ...props
}: ThemedPressableProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      {...props}
      style={[
        {
          backgroundColor:
            variant === "primary" ? theme.primary : theme.secondary,
          borderRadius: 20,
          margin: 10,
          padding: 10,
          elevation: 2,
        },
      ]}
    >
      <Text style={{ color: theme.text }}>{text}</Text>
    </Pressable>
  );
}
