import { Stack } from "expo-router";
import ThemeProvider from "@/theme/theme-provider";
import AuthProvider, { useAuth } from "@/auth/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </AuthProvider>
  );

  function RootNavigator() {
    const { isLoggedIn } = useAuth();

    return (
      <Stack>
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen
            name="(authenticated)"
            options={{ headerShown: false }}
          />
        </Stack.Protected>

        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    );
  }
}
