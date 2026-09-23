import * as SecureStore from 'expo-secure-store'

const accessTokenKey = 'accessToken';

export function storeAccessToken(accessToken: string) {
    SecureStore.setItem(accessTokenKey,accessToken);
}

export function getAccessToken(): string | null {
    return SecureStore.getItem(accessTokenKey);
}