import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { AuthStackParamList } from "../types/navigation";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Otp">;
  route: RouteProp<AuthStackParamList, "Otp">;
};

export function OtpScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);

  async function tryLogin() {
    setLoading(true);
    try {
      const res = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      });
      setToken(res.token);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("sign up")) {
        navigation.navigate("Register", { phone, otp });
      } else {
        Alert.alert("Login failed", msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.sub}>Sent to {phone}</Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit code"
        placeholderTextColor="#666"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
      />
      <Pressable style={styles.btn} onPress={tryLogin} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Verifying…" : "Continue"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 8 },
  sub: { fontSize: 14, color: "#9ca3af", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    marginBottom: 16,
    fontSize: 18,
    letterSpacing: 4,
  },
  btn: { backgroundColor: "#22c55e", padding: 16, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#022c22", fontWeight: "700", fontSize: 16 },
});
