import { ComponentProps } from "react";
import { Pressable } from "react-native";
import { useTheme } from "@/app/theme";

type ThemedPressableProps = ComponentProps<typeof Pressable> & {
  variant?: "primary" | "secondary";
};

export default function ThemedPressable({
  variant = "primary",
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
    />
  );
}
