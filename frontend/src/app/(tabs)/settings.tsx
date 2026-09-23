import { Dropdown } from "react-native-element-dropdown";
import { View, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import { THEME_NAMES } from "@/theme/themes";
import ThemedPressable from "@/components/themed-pressable";

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();

  const themeDropdownData = THEME_NAMES.map((name) => ({
    label: name,
    value: name,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text }}>Theme</Text>
      <Dropdown
        style={[styles.dropdown, { backgroundColor: theme.inputBackground }]}
        placeholderStyle={{ color: theme.inputText }}
        selectedTextStyle={{ color: theme.inputText }}
        data={themeDropdownData}
        maxHeight={300}
        labelField="label"
        valueField="value"
        searchPlaceholder="Select theme"
        value={theme.name}
        onChange={(item) => {
          setTheme(item.value);
        }}
      />
      <ThemedPressable onPress={logout}>
        <Text style={{ color: theme.text }}>log out</Text>
      </ThemedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    margin: 16,
    height: 50,
    width: 150,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
});
