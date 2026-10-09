import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import ThemedPressable from "@/components/themed-pressable";
import ErrorMessage from "@/components/error-message";
import { useAsyncAction } from "@/hooks/use-async-action";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { theme } = useTheme();
  const { login } = useAuth();

  const {
    run: runLogin,
    isLoading,
    error,
  } = useAsyncAction(async () => {
    const result = await login({ email, password });

    // `login` returns a result rather than throwing (auth-context 4.1). Convert the failure case
    // into a throw so `useAsyncAction` records the message and clears its loading flag.
    if (!result.ok) {
      throw new ApiError(result.error ?? GENERIC_ERROR_MESSAGE, {
        status: 0,
        code: "invalid_credentials",
      });
    }

    return result;
  });

  async function handleLoginPress() {
    const result = await runLogin();

    // Only navigate on success. Previously this was unconditional and simply never ran on
    // failure, so the user saw an inert screen with no explanation.
    if (result.ok) {
      router.push("/");
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text }}>email</Text>
      <TextInput
        placeholder="email"
        value={email}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setEmail}
      />
      <Text style={{ color: theme.text }}>password</Text>
      <TextInput
        secureTextEntry
        placeholder="password"
        value={password}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setPassword}
      />
      {error && <ErrorMessage message={error} />}
      <ThemedPressable
        variant="primary"
        text="log in"
        disabled={isLoading}
        onPress={handleLoginPress}
      />
      <ThemedPressable
        variant="secondary"
        text="create account"
        onPress={() => {
          router.push("/register");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    margin: 16,
    height: 50,
    width: 150,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
});
