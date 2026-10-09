import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import LoginScreen from "../login";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { ApiError } from "@/api/api-error";

const mockLogin = jest.fn().mockResolvedValue({ ok: true });

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

async function enterCredentials() {
  await fireEvent.changeText(screen.getByPlaceholderText("email"), "a@b.com");
  await fireEvent.changeText(screen.getByPlaceholderText("password"), "secret1");
}

beforeEach(() => jest.clearAllMocks());

it("logs in with the entered credentials and navigates home", async () => {
  mockLogin.mockResolvedValue({ ok: true });

  await renderScreen();

  await enterCredentials();
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

it("shows the server's message and does not navigate when login fails", async () => {
  mockLogin.mockResolvedValue({
    ok: false,
    error: "invalid email or password",
  });

  await renderScreen();

  await enterCredentials();
  await fireEvent.press(screen.getByText("log in"));

  await waitFor(() =>
    expect(screen.getByText("invalid email or password")).toBeTruthy(),
  );
  expect(router.push).not.toHaveBeenCalled();
});

it("disables the button while the attempt is in flight", async () => {
  let settle!: (value: { ok: boolean; error?: string }) => void;
  mockLogin.mockReturnValue(
    new Promise((resolve) => {
      settle = resolve;
    }),
  );

  await renderScreen();

  await enterCredentials();
  // Deliberately not awaited: fireEvent.press would block on the still-pending login.
  fireEvent.press(screen.getByText("log in"));

  await waitFor(() =>
    expect(screen.getByText("log in").parent?.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    ),
  );

  settle({ ok: false, error: "not found" });

  await waitFor(() => expect(screen.getByText("not found")).toBeTruthy());
  expect(
    screen.getByText("log in").parent?.props.accessibilityState?.disabled,
  ).toBeFalsy();
});

it("clears a previous error on the next attempt", async () => {
  mockLogin.mockResolvedValueOnce({ ok: false, error: "invalid email or password" });
  mockLogin.mockResolvedValueOnce({ ok: true });

  await renderScreen();

  await enterCredentials();
  await fireEvent.press(screen.getByText("log in"));
  await waitFor(() =>
    expect(screen.getByText("invalid email or password")).toBeTruthy(),
  );

  await fireEvent.press(screen.getByText("log in"));

  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
  expect(screen.queryByText("invalid email or password")).toBeNull();
});

it("falls back to a generic message when login rejects with a non-ApiError", async () => {
  mockLogin.mockRejectedValue(new TypeError("Network request failed"));

  await renderScreen();

  await enterCredentials();
  await fireEvent.press(screen.getByText("log in"));

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
  expect(router.push).not.toHaveBeenCalled();
});

it("does not surface a raw stack trace", async () => {
  const error = new ApiError("invalid email or password", {
    status: 401,
    code: "invalid_credentials",
  });
  mockLogin.mockResolvedValue({ ok: false, error: error.message });

  await renderScreen();

  await enterCredentials();
  await fireEvent.press(screen.getByText("log in"));

  await waitFor(() =>
    expect(screen.getByText("invalid email or password")).toBeTruthy(),
  );
  expect(screen.queryByText(/at Object/)).toBeNull();
});
