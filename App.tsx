import { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [n, setN] = useState(0);
  const [text, setText] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Mini Playground</Text>

      <TextInput
      value={text}
      onChangeText={setText}
      placeholder='내용을 입력하세요.'
      style={{ borderWidth: 1, borderColor: '#ddd', width: 240, height: 44, borderRadius: 10, paddingHorizontal: 12 }}
      />
      <Text>입력: {text || '(비어있음)'}. 길이: {text.length}</Text>
      <Text style={styles.count}>{n}</Text>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => setN((v) => v - 1)}>
          <Text style={styles.btnText}>-1</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => setN((0))}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => setN((v) => v + 1)}>
          <Text style={styles.btnText}>+1</Text>
        </Pressable>
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  count: { fontSize: 48, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  btn: { backgroundColor: '#111', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});