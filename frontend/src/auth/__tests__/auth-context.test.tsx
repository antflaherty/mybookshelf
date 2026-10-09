import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import AuthProvider, { useAuth } from "@/auth/auth-context";
import * as secureStore from "@/storage/secureStore";
import * as apiClient from "@/api/apiClient";

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
  return (
    <>
      <Text testID="token">{accessToken ?? "none"}</Text>
      <Text testID="loggedIn">{isLoggedIn ? "yes" : "no"}</Text>
      <Text
        testID="login"
        onPress={() => login({ email: "a@b.com", password: "pw" })}
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
  expect(mockedStore.storeAccessToken).toHaveBeenCalledWith("new-token");
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

it("throws when useAuth is used outside the provider", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(render(<Probe />)).rejects.toThrow(
    "useAuth must be used within an AuthProvider",
  );
});
