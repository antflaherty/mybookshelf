import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import LoginScreen from "../login";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";

const mockLogin = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/auth/auth-context", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

async function renderScreen() {
  await render(
    <ThemeProvider>
      <LoginScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

it("logs in with the entered credentials and navigates home", async () => {
  await renderScreen();

  await fireEvent.changeText(screen.getByPlaceholderText("email"), "a@b.com");
  await fireEvent.changeText(screen.getByPlaceholderText("password"), "secret1");
  await fireEvent.press(screen.getByText("log in"));

  await waitFor(() =>
    expect(mockLogin).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret1",
    }),
  );
  expect(router.push).toHaveBeenCalledWith("/");
});

it("navigates to register", async () => {
  await renderScreen();

  await fireEvent.press(screen.getByText("create account"));

  expect(router.push).toHaveBeenCalledWith("/register");
});
