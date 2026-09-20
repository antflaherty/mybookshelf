import { Dropdown } from "react-native-element-dropdown";
import { View, StyleSheet } from "react-native";
import { useTheme, THEMES } from "@/app/theme";

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();

  const themeDropdownData = Object.keys(THEMES).map((name) => ({
    label: name,
    value: name,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
