import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ThemeProvider, { useTheme } from "@/theme/theme-provider";
import { THEMES } from "@/theme/themes";
import { Text } from "react-native";

function ThemeProbe() {
  const { theme } = useTheme();
  return <Text>{theme.name}</Text>;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

it("defaults to the forest theme", async () => {
  await render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );

  await waitFor(() => expect(screen.getByText("forest")).toBeTruthy());
});

it("restores a stored theme on mount", async () => {
  await AsyncStorage.setItem("theme", JSON.stringify(THEMES.sky));

  await render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );

  await waitFor(() => expect(screen.getByText("sky")).toBeTruthy());
});

it("setTheme updates the theme and persists it", async () => {
  function SetThemeProbe() {
    const { theme, setTheme } = useTheme();
    return (
      <>
        <Text>{theme.name}</Text>
        <Text testID="switch" onPress={() => setTheme("sunset")}>
          switch
        </Text>
      </>
    );
  }

  await render(
    <ThemeProvider>
      <SetThemeProbe />
    </ThemeProvider>,
  );

  await fireEvent.press(screen.getByTestId("switch"));

  await waitFor(() => expect(screen.getByText("sunset")).toBeTruthy());
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "theme",
    JSON.stringify(THEMES.sunset),
  );
});

it("throws when useTheme is used outside the provider", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(render(<ThemeProbe />)).rejects.toThrow(
    "useTheme must be used inside a ThemeProvider",
  );
});
