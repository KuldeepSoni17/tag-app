import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { AuthStackParamList } from "../types/navigation";

type QuizQuestion = {
  id: number;
  prompt: string;
  options: { id: string; label: string }[];
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Register">;
  route: RouteProp<AuthStackParamList, "Register">;
};

export function RegisterScreen({ route }: Props) {
  const { phone, otp } = route.params;
  const [username, setUsername] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ questions: QuizQuestion[] }>("/quiz/questions");
        setQuestions(res.questions);
      } catch (e) {
        Alert.alert("Quiz load failed", String(e));
      }
    })();
  }, []);

  function pick(qid: number, letter: string) {
    setAnswers((prev) => ({ ...prev, [qid]: letter }));
  }

  async function onSubmit() {
    setLoading(true);
    try {
      const payloadAnswers: Record<string, string> = {};
      for (const q of questions) {
        payloadAnswers[String(q.id)] = answers[q.id];
      }
      const res = await api<{ token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          phone,
          otp,
          username: username.trim() || undefined,
          answers: payloadAnswers,
        }),
      });
      setToken(res.token);
    } catch (e) {
      Alert.alert("Sign up failed", String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create profile</Text>
      <Text style={styles.sub}>Pick a username (optional — random if empty) and answer 5 quick taps.</Text>
      <TextInput
        style={styles.input}
        placeholder="username (optional)"
        placeholderTextColor="#666"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      {questions.map((q) => (
        <View key={q.id} style={styles.card}>
          <Text style={styles.q}>{q.prompt}</Text>
          {q.options.map((o) => {
            const selected = answers[q.id] === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => pick(q.id, o.id)}
                style={[styles.opt, selected && styles.optOn]}
              >
                <Text style={[styles.optText, selected && styles.optTextOn]}>
                  {o.id}. {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Pressable style={styles.btn} onPress={onSubmit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Creating…" : "Finish"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, backgroundColor: "#0a0a0a" },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 8 },
  sub: { fontSize: 14, color: "#9ca3af", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  q: { color: "#e5e7eb", fontWeight: "600", marginBottom: 8 },
  opt: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "#111",
  },
  optOn: { backgroundColor: "#14532d" },
  optText: { color: "#d1d5db" },
  optTextOn: { color: "#bbf7d0", fontWeight: "600" },
  btn: { backgroundColor: "#22c55e", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  btnText: { color: "#022c22", fontWeight: "700", fontSize: 16 },
});
