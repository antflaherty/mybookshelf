import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import RegisterScreen from "../register";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { register } from "@/api/apiClient";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/api/apiClient", () => ({
  register: jest.fn().mockResolvedValue(undefined),
}));

const mockedRegister = register as jest.Mock;

beforeEach(() => jest.clearAllMocks());

async function renderScreen() {
  await render(
    <ThemeProvider>
      <RegisterScreen />
    </ThemeProvider>,
  );
}

it("registers and navigates to login", async () => {
  await renderScreen();

  await fireEvent.changeText(screen.getByPlaceholderText("email"), "new@example.com");
  await fireEvent.changeText(screen.getByPlaceholderText("password"), "secret1");
  await fireEvent.changeText(
    screen.getByPlaceholderText("confirm password"),
    "secret1",
  );
  await fireEvent.press(screen.getByText("submit"));

  await waitFor(() =>
    expect(mockedRegister).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret1",
    }),
  );
  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
});

it("shows a validation error for a bad email and does not register", async () => {
  await renderScreen();

  await fireEvent.changeText(screen.getByPlaceholderText("email"), "not-an-email");
  await fireEvent.changeText(screen.getByPlaceholderText("password"), "secret1");
  await fireEvent.changeText(
    screen.getByPlaceholderText("confirm password"),
    "secret1",
  );
  await fireEvent.press(screen.getByText("submit"));

  await waitFor(() => expect(mockedRegister).not.toHaveBeenCalled());
  expect(router.push).not.toHaveBeenCalled();
});

it("does not register when passwords do not match", async () => {
  await renderScreen();

  await fireEvent.changeText(screen.getByPlaceholderText("email"), "new@example.com");
  await fireEvent.changeText(screen.getByPlaceholderText("password"), "secret1");
  await fireEvent.changeText(
    screen.getByPlaceholderText("confirm password"),
    "different1",
  );
  await fireEvent.press(screen.getByText("submit"));

  await waitFor(() => expect(mockedRegister).not.toHaveBeenCalled());
});
