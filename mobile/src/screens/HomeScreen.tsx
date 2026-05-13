import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, RefreshControl, ScrollView, Alert } from "react-native";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";

type MeResponse = {
  user: { username: string };
  contest: { id: string; status: string; date: string };
  chain: { id: string; length: number; nodes: { position: number; username: string; approved: boolean }[] };
  pendingTag: { nodeId: string; from: string } | null;
};

export function HomeScreen() {
  const token = useAuthStore((s) => s.token);
  const setToken = useAuthStore((s) => s.setToken);
  const [data, setData] = useState<MeResponse | null>(null);
  const [today, setToday] = useState<{ contest: { status: string; prizeAmount: string } } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tagUser, setTagUser] = useState("");

  const load = useCallback(async () => {
    const [me, t] = await Promise.all([
      api<MeResponse>("/contest/me", { token }),
      api<{ contest: { status: string; prizeAmount: string } }>("/contest/today"),
    ]);
    setData(me);
    setToday(t);
  }, [token]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      Alert.alert("Refresh failed", String(e));
    } finally {
      setRefreshing(false);
    }
  }

  async function sendTag() {
    try {
      await api("/tags/send", {
        method: "POST",
        token,
        body: JSON.stringify({ username: tagUser.trim() }),
      });
      setTagUser("");
      await load();
      Alert.alert("Tag sent", "They will need to approve.");
    } catch (e) {
      Alert.alert("Tag failed", String(e));
    }
  }

  async function respond(nodeId: string, action: "approve" | "ignore") {
    try {
      await api(`/tags/${nodeId}/respond`, {
        method: "POST",
        token,
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e) {
      Alert.alert("Respond failed", String(e));
    }
  }

  useEffect(() => {
    load().catch((e) => Alert.alert("Load failed", String(e)));
  }, [load]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Pressable onPress={() => setToken(null)}>
          <Text style={styles.link}>Log out</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Contest</Text>
        <Text style={styles.value}>
          Status: {today?.contest.status ?? data?.contest.status ?? "…"} · Prize ₹{today?.contest.prizeAmount ?? "0"}
        </Text>
      </View>
      {data?.pendingTag ? (
        <View style={styles.card}>
          <Text style={styles.label}>You were tagged</Text>
          <Text style={styles.value}>@{data.pendingTag.from} added you to their chain.</Text>
          <View style={styles.row}>
            <Pressable style={styles.smallBtn} onPress={() => respond(data.pendingTag!.nodeId, "approve")}>
              <Text style={styles.smallBtnText}>Approve</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.ghost]} onPress={() => respond(data.pendingTag!.nodeId, "ignore")}>
              <Text style={[styles.smallBtnText, styles.ghostText]}>Ignore</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.label}>Your chain</Text>
        <Text style={styles.value}>Length: {data?.chain.length ?? "…"}</Text>
        {data?.chain.nodes?.map((n) => (
          <Text key={`${n.position}-${n.username}`} style={styles.mono}>
            {n.position}. @{n.username} {n.approved ? "✓" : "…pending"}
          </Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Tag next player</Text>
        <Text style={styles.hint}>You must be the tail of your chain.</Text>
        <TextInput
          style={styles.input}
          placeholder="username"
          placeholderTextColor="#666"
          autoCapitalize="none"
          value={tagUser}
          onChangeText={setTagUser}
        />
        <Pressable style={styles.btn} onPress={sendTag}>
          <Text style={styles.btnText}>Send tag</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a", paddingHorizontal: 20, paddingTop: 56 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#fff" },
  link: { color: "#6ee7b7", fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  label: { color: "#9ca3af", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  value: { color: "#e5e7eb", fontSize: 16, marginBottom: 8 },
  hint: { color: "#6b7280", fontSize: 13, marginBottom: 8 },
  mono: { color: "#d1d5db", fontFamily: "Courier", marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  smallBtn: { flex: 1, backgroundColor: "#22c55e", padding: 12, borderRadius: 10, alignItems: "center" },
  smallBtnText: { color: "#022c22", fontWeight: "700" },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#3f3f46" },
  ghostText: { color: "#e5e7eb" },
  input: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    marginBottom: 10,
  },
  btn: { backgroundColor: "#22c55e", padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#022c22", fontWeight: "700" },
});
