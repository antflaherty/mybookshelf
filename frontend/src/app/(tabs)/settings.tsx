import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useTheme } from "@/app/theme";
import { useState } from "react";

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const [backgroundColor, setBackgroundColor] = useState(theme.backgroundColor);
  const [textColor, setTextColor] = useState(theme.textColor);

  function handleApplyPress() {
    const newTheme = { backgroundColor, textColor };
    setTheme(newTheme);
  }

  return (
    <View style={styles.container}>
      <View style={{ backgroundColor: theme.backgroundColor }}>
        <Text style={{ color: theme.textColor }}>Background Colour</Text>
        <TextInput
          value={backgroundColor}
          onChangeText={setBackgroundColor}
        ></TextInput>
        <Text style={{ color: theme.textColor }}>Text Colour</Text>
        <TextInput value={textColor} onChangeText={setTextColor}></TextInput>
        <Pressable onPress={handleApplyPress}>
          <Text>Apply</Text>
        </Pressable>
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
