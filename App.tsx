import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useMemo, useEffect } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet, TextInput, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';

type Item = { id: string, text: string };

const MAX_LEN = 50;
const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

const STORAGE_KEY = 'mini:list:v1';
const STORAGE_VERSION = 1;

export default function App() {
  const [n, setN] = useState(0);
  const [text, setText] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  // 초기 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
  
        const parsed = JSON.parse(raw) as {
          version: number;
          items: { id: string, text: string }[];
        };
  
        if (!parsed.version || parsed.version < STORAGE_VERSION) {
          // 필요하면 여기서 변환 로직 수행
          setItems(parsed.items ?? []);
          //저장 포맷 최신화
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: STORAGE_VERSION, items: parsed.items ?? [] })
          );
        } else {
          setItems(parsed.items ?? []);
        }
      } catch (e) {
        console.warn('Failed to load items from storage', e);
      }
    })();
  }, []);

  // items 변경 시 저장
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: STORAGE_VERSION, items})
        );
      } catch (e) {
        console.warn('Failed to save items to storage', e);
      }
    })();
  }, [items]);

  // 입력 처리
  const trimmed = text.trim();
  const normalizedText = normalize(text);
  const isDuplicate = items.some((it) => normalize(it.text) === normalizedText)

  const canAdd = trimmed.length >= 3 && !isDuplicate; // 중복이면 비활성화

  const remaining = MAX_LEN - text.length;
  const limitedText = (v: string) => (v.length <= MAX_LEN ? v : v.slice(0, MAX_LEN));

  const addItem = () => {
    if (!canAdd) return;
    setItems(prev => [{ id: Date.now().toString(), text: trimmed }, ...prev]);
    setText('');
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const empty = useMemo(() => items.length === 0, [items.length]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Mini Counter</Text>

      {/* 입력 */}
      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={(v) => setText(limitedText(v))}
          placeholder='내용을 입력하세요.'
          style={styles.input}
          returnKeyType='done'
          onSubmitEditing={addItem}
        />
        
        <Pressable style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
          onPress={addItem}
          disabled={!canAdd}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: '#b00' }]}
          onPress={async () => {
            setItems([]);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }}
        >
          <Text style={styles.btnText}>Clear All</Text>
        </Pressable>
      </View>
      <Text style={styles.helper}>
          {isDuplicate
            ? '이미 같은 메모가 있어요!'
            : `입력: ${trimmed || '(비어있음)'}. 길이: ${text.length} (남은 ${remaining})`}
        </Text>

      {/* Counter */}
      <Text style={styles.count}>{n}</Text>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => setN(v => v - 1)}>
          <Text style={styles.btnText}>-1</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => setN(0)}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => setN(v => v + 1)}>
          <Text style={styles.btnText}>+1</Text>
        </Pressable>
      </View>

      {/* List */}
      <View style={{ alignSelf: 'stretch', marginTop: 16, flex: 1, maxHeight: 300}}>
        {empty ? (
          <View style={styles.emptyBox}>
            <Text style={{ color: '#777' }}>List is empty. Add some items!</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingHorizontal: 4}}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={{ flex: 1 }}>{item.text}</Text>
                <Pressable onPress={() => removeItem(item.id)}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  helper: { color: '#666' },
  count: { fontSize: 48, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  btn: { backgroundColor: '#111', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },

  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1, borderColor: '#ddd', width: 240, height: 44, borderRadius: 10, paddingHorizontal: 12
  },
  addBtn: {
    backgroundColor: '#111', paddingHorizontal: 14, height: 44,
    borderRadius: 10, justifyContent: 'center'
  },
  addBtnDisabled: { backgroundColor: '#999' },
  addBtnText: { color: '#fff', fontWeight: '700' },

  emptyBox: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 12,
    padding: 16, alignItems: 'center', justifyContent: 'center'
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f6f6f6', padding: 12, borderRadius: 12
  },
  delete: { color: '#d00', fontWeight: '700' }
});