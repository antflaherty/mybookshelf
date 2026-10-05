import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import ThemedPressable from "@/components/themed-pressable";
import ThemeProvider from "@/theme/theme-provider";

it("renders the text and responds to presses", async () => {
  const onPress = jest.fn();

  await render(
    <ThemeProvider>
      <ThemedPressable text="Save" onPress={onPress} />
    </ThemeProvider>,
  );

  await fireEvent.press(screen.getByText("Save"));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it("renders secondary variant", async () => {
  await render(
    <ThemeProvider>
      <ThemedPressable text="Cancel" variant="secondary" />
    </ThemeProvider>,
  );

  expect(screen.getByText("Cancel")).toBeTruthy();
});
