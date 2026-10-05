import {
  deleteAccessToken,
  getAccessToken,
  storeAccessToken,
} from "@/storage/secureStore";
import * as SecureStore from "expo-secure-store";

jest.mock("expo-secure-store", () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn(),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mocked = SecureStore as jest.Mocked<typeof SecureStore>;

beforeEach(() => jest.clearAllMocks());

it("stores the access token under the accessToken key", async () => {
  await storeAccessToken("tok123");
  expect(mocked.setItem).toHaveBeenCalledWith("accessToken", "tok123");
});

it("retrieves the access token", async () => {
  (mocked.getItem as unknown as jest.Mock).mockResolvedValue("stored");
  await expect(getAccessToken()).resolves.toBe("stored");
  expect(mocked.getItem).toHaveBeenCalledWith("accessToken");
});

it("deletes the access token", async () => {
  await deleteAccessToken();
  expect(mocked.deleteItemAsync).toHaveBeenCalledWith("accessToken");
});
