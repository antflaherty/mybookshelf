import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { useState } from "react";
import AuthProvider, { useAuth } from "@/auth/auth-context";
import * as secureStore from "@/storage/secureStore";
import * as apiClient from "@/api/apiClient";
import { ApiError } from "@/api/api-error";

jest.mock("@/storage/secureStore", () => ({
  storeAccessToken: jest.fn(),
  getAccessToken: jest.fn(),
  deleteAccessToken: jest.fn(),
}));

jest.mock("@/api/apiClient", () => ({
  login: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const mockedStore = secureStore as jest.Mocked<typeof secureStore>;
const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

function Probe() {
  const { accessToken, isLoggedIn, login, logout } = useAuth();
  const [result, setResult] = useState("pending");

  return (
    <>
      <Text testID="token">{accessToken ?? "none"}</Text>
      <Text testID="loggedIn">{isLoggedIn ? "yes" : "no"}</Text>
      <Text testID="result">{result}</Text>
      <Text
        testID="login"
        onPress={async () => {
          const outcome = await login({ email: "a@b.com", password: "pw" });
          setResult(outcome.ok ? "ok" : `failed:${outcome.error}`);
        }}
      >
        login
      </Text>
      <Text testID="logout" onPress={() => logout()}>
        logout
      </Text>
    </>
  );
}

beforeEach(() => jest.clearAllMocks());

it("restores the stored token on mount", async () => {
  mockedStore.getAccessToken.mockReturnValue("stored-token" as unknown as null);

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("stored-token"),
  );
  expect(screen.getByTestId("loggedIn").props.children).toBe("yes");
});

it("starts logged out when there is no stored token", async () => {
  mockedStore.getAccessToken.mockReturnValue(null);

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("none"),
  );
});

it("login stores the token and marks the user logged in", async () => {
  mockedStore.getAccessToken.mockReturnValue(null);
  mockedApi.login.mockResolvedValue("new-token");

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await fireEvent.press(screen.getByTestId("login"));

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("new-token"),
  );
  expect(screen.getByTestId("result").props.children).toBe("ok");
  expect(mockedStore.storeAccessToken).toHaveBeenCalledWith("new-token");
});

it("login resolves {ok: false, error} when the api rejects", async () => {
  mockedStore.getAccessToken.mockReturnValue(null);
  mockedApi.login.mockRejectedValue(
    new ApiError("invalid email or password", {
      status: 401,
      code: "invalid_credentials",
    }),
  );

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await fireEvent.press(screen.getByTestId("login"));

  await waitFor(() =>
    expect(screen.getByTestId("result").props.children).toBe(
      "failed:invalid email or password",
    ),
  );
  expect(screen.getByTestId("token").props.children).toBe("none");
});

it("login does not store or set a token when the api rejects", async () => {
  mockedStore.getAccessToken.mockReturnValue(null);
  mockedApi.login.mockRejectedValue(
    new ApiError("not found", { status: 404, code: "not_found" }),
  );

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await fireEvent.press(screen.getByTestId("login"));

  await waitFor(() =>
    expect(screen.getByTestId("result").props.children).toBe("failed:not found"),
  );
  expect(mockedStore.storeAccessToken).not.toHaveBeenCalled();
  expect(screen.getByTestId("loggedIn").props.children).toBe("no");
});

it("login falls back to a generic message for a non-ApiError rejection", async () => {
  mockedStore.getAccessToken.mockReturnValue(null);
  mockedApi.login.mockRejectedValue(new TypeError("Network request failed"));

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await fireEvent.press(screen.getByTestId("login"));

  await waitFor(() =>
    expect(screen.getByTestId("result").props.children).toBe(
      "failed:something went wrong. please try again.",
    ),
  );
});

it("login surfaces a storeAccessToken failure as a failed login", async () => {
  mockedStore.getAccessToken.mockReturnValue(null);
  mockedApi.login.mockResolvedValue("new-token");
  mockedStore.storeAccessToken.mockRejectedValue(
    new Error("secure store unavailable"),
  );

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await fireEvent.press(screen.getByTestId("login"));

  await waitFor(() =>
    expect(screen.getByTestId("result").props.children).toBe(
      "failed:something went wrong. please try again.",
    ),
  );
  // The token was never persisted, so it must not be held in memory either.
  expect(screen.getByTestId("token").props.children).toBe("none");
  expect(screen.getByTestId("loggedIn").props.children).toBe("no");
});

it("logout clears the token", async () => {
  mockedStore.getAccessToken.mockReturnValue("tok" as unknown as null);

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("tok"),
  );

  await fireEvent.press(screen.getByTestId("logout"));

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("none"),
  );
  expect(mockedStore.deleteAccessToken).toHaveBeenCalled();
});

it("registers logout as the unauthorized handler on mount", async () => {
  mockedStore.getAccessToken.mockReturnValue("tok" as unknown as null);

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  expect(mockedApi.setUnauthorizedHandler).toHaveBeenCalledTimes(1);
  expect(typeof mockedApi.setUnauthorizedHandler.mock.calls[0][0]).toBe(
    "function",
  );
});

it("logs the user out when the registered handler is invoked", async () => {
  mockedStore.getAccessToken.mockReturnValue("tok" as unknown as null);

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("tok"),
  );

  const handler = mockedApi.setUnauthorizedHandler.mock.calls[0][0];
  await act(async () => {
    await handler();
  });

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("none"),
  );
  expect(mockedStore.deleteAccessToken).toHaveBeenCalled();
});

it("does not re-register the handler when the token changes", async () => {
  mockedStore.getAccessToken.mockReturnValue("tok" as unknown as null);

  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("tok"),
  );

  const registered = mockedApi.setUnauthorizedHandler.mock.calls[0][0];

  await fireEvent.press(screen.getByTestId("logout"));

  await waitFor(() =>
    expect(screen.getByTestId("token").props.children).toBe("none"),
  );

  expect(mockedApi.setUnauthorizedHandler).toHaveBeenCalledTimes(1);
  expect(mockedApi.setUnauthorizedHandler.mock.calls[0][0]).toBe(registered);
});

it("throws when useAuth is used outside the provider", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(render(<Probe />)).rejects.toThrow(
    "useAuth must be used within an AuthProvider",
  );
});
