import { Dropdown } from "react-native-element-dropdown";
import { View, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/theme-provider";
import { THEME_NAMES } from "@/theme/themes";

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();

  const themeDropdownData = THEME_NAMES.map((name) => ({
    label: name,
    value: name,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text }}>Theme</Text>
      <Dropdown
        style={[styles.dropdown, { backgroundColor: theme.inputBackground }]}
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
