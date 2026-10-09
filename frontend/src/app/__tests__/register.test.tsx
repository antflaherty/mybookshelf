import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import RegisterScreen from "../register";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { register } from "@/api/apiClient";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

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

async function submitValidForm() {
  await fireEvent.changeText(
    screen.getByPlaceholderText("email"),
    "taken@example.com",
  );
  await fireEvent.changeText(screen.getByPlaceholderText("password"), "secret1");
  await fireEvent.changeText(
    screen.getByPlaceholderText("confirm password"),
    "secret1",
  );
  await fireEvent.press(screen.getByText("submit"));
}

it("shows the server's message when the email is already registered", async () => {
  mockedRegister.mockRejectedValue(
    ApiError.fromResponse(409, {
      error: { code: "email_taken", message: "email already registered" },
    }),
  );

  await renderScreen();
  await submitValidForm();

  await waitFor(() => expect(screen.getByText("email already registered")).toBeTruthy());
  expect(router.push).not.toHaveBeenCalled();
});

it("does not leak raw server text on a 5xx", async () => {
  // An older backend returned {"error": "<raw postgres string>"} with a 500. That text must never
  // reach a user, and must not render as "[object Object]" either.
  mockedRegister.mockRejectedValue(
    ApiError.fromResponse(500, {
      error: 'pq: duplicate key value violates unique constraint "users_email_key"',
    }),
  );

  await renderScreen();
  await submitValidForm();

  await waitFor(() =>
    expect(screen.getByText(GENERIC_ERROR_MESSAGE)).toBeTruthy(),
  );
  expect(screen.queryByText(/duplicate key/)).toBeNull();
  expect(screen.queryByText(/\[object Object\]/)).toBeNull();
});

it("shows the generic message when register rejects with something that is not an ApiError", async () => {
  // Guards the regression that produced "[object Object]": a non-ApiError whose fields are
  // arbitrary must never be rendered verbatim.
  mockedRegister.mockRejectedValue({ message: { nested: true } });

  await renderScreen();
  await submitValidForm();

  await waitFor(() =>
    expect(screen.getByText(GENERIC_ERROR_MESSAGE)).toBeTruthy(),
  );
  expect(screen.queryByText(/\[object Object\]/)).toBeNull();
});
