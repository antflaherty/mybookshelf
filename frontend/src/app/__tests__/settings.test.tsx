import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SettingsScreen from "../(authenticated)/(tabs)/settings";
import ThemeProvider from "@/theme/theme-provider";

const mockLogout = jest.fn();

jest.mock("@/auth/auth-context", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

jest.mock("react-native-element-dropdown", () => ({
  Dropdown: () => null,
}));

beforeEach(() => jest.clearAllMocks());

it("logs out when the button is pressed", async () => {
  await render(
    <ThemeProvider>
      <SettingsScreen />
    </ThemeProvider>,
  );

  expect(screen.getByText("Theme")).toBeTruthy();

  await fireEvent.press(screen.getByText("log out"));

  expect(mockLogout).toHaveBeenCalledTimes(1);
});
