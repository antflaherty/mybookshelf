import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/theme-provider";
import { register } from "@/api/apiClient";
import ThemedPressable from "@/components/themed-pressable";
import * as z from "zod";

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasMatchingPasswords, setHasMatchingPasswords] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { theme } = useTheme();

  async function handleSubmitPress() {
    const passwordsMatch = password === confirmPassword;
    setHasMatchingPasswords(passwordsMatch);

    if (!passwordsMatch) {
      return;
    }
    try {
      setIsLoading(true);

      const user = UserSchema.parse({ email, password });

      await register(user);
      setEmail("");
      setEmailError("");
      setPassword("");
      setPasswordError("");
      router.push("/login");
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((issue) => {
          if (issue.path[0] === "email") {
            setEmailError(issue.message);
          }
          if (issue.path[0] === "password") {
            setPasswordError(issue.message);
          }
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.loading} />
        </View>
      )}
      <Text style={{ color: theme.text }}>email</Text>
      <TextInput
        placeholder="email"
        value={email}
        style={[
          styles.input,
          {
            backgroundColor: !emailError
              ? theme.inputBackground
              : theme.errorInputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setEmail}
      />
      {!!emailError && (
        <Text style={{ color: theme.errorText }}>{emailError}</Text>
      )}
      <Text style={{ color: theme.text }}>password</Text>
      <TextInput
        secureTextEntry
        placeholder="password"
        value={password}
        style={[
          styles.input,
          {
            backgroundColor:
              hasMatchingPasswords || !passwordError
                ? theme.inputBackground
                : theme.errorInputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setPassword}
      />
      {!!passwordError && (
        <Text style={{ color: theme.errorText }}>{passwordError}</Text>
      )}
      <Text style={{ color: theme.text }}>confirm password</Text>
      <TextInput
        secureTextEntry
        placeholder="confirm password"
        value={confirmPassword}
        style={[
          styles.input,
          {
            backgroundColor: hasMatchingPasswords
              ? theme.inputBackground
              : theme.errorInputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setConfirmPassword}
      />
      {!hasMatchingPasswords && (
        <Text style={{ color: theme.errorText }}>passwords do not match</Text>
      )}
      <ThemedPressable
        variant="primary"
        text="submit"
        onPress={handleSubmitPress}
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
  input: {
    margin: 16,
    height: 50,
    width: 150,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
});
