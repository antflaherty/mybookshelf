import * as SecureStore from "expo-secure-store";

const accessTokenKey = "accessToken";

export async function storeAccessToken(accessToken: string) {
  // `setItemAsync`, not `setItem`: the synchronous variant returns void, so a caller cannot
  // await it and a storage failure surfaces as an unhandled rejection instead of a catchable one.
  await SecureStore.setItemAsync(accessTokenKey, accessToken);
}

export function getAccessToken(): string | null {
  return SecureStore.getItem(accessTokenKey);
}

export async function deleteAccessToken() {
  await SecureStore.deleteItemAsync(accessTokenKey);
}
