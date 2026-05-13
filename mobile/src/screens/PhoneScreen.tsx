import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { AuthStackParamList } from "../types/navigation";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Phone">;
};

export function PhoneScreen({ navigation }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone);

  async function onSend() {
    setLoading(true);
    try {
      await api("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
      setPendingPhone(phone);
      navigation.navigate("Otp", { phone });
    } catch (e) {
      Alert.alert("Could not send OTP", String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tag App</Text>
      <Text style={styles.sub}>Phone sign-in (MSG91 or dev OTP)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 9876543210"
        placeholderTextColor="#666"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <Pressable style={styles.btn} onPress={onSend} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Sending…" : "Send OTP"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 8 },
  sub: { fontSize: 14, color: "#9ca3af", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    marginBottom: 16,
    fontSize: 16,
  },
  btn: { backgroundColor: "#22c55e", padding: 16, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#022c22", fontWeight: "700", fontSize: 16 },
});
