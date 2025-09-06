import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useMemo, useEffect } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet, TextInput, FlatList, Modal, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

type Item = { id: string, text: string };

const MAX_LEN = 50;
const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

const STORAGE_KEY = 'mini:list:v1';
const STORAGE_VERSION = 1;

export default function App() {
  const [n, setN] = useState(0);
  const [text, setText] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Item | null>(null);
  const [editText, setEditText] = useState('');

  // 삭제 버튼 눌렀을 때 (삭제 확인 모달 오픈)
  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
  }

  // 삭제 수행
  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    setItems(prev => prev.filter(i => i.id !== pendingDeleteId));
    setPendingDeleteId(null);
    Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
    showToast('Memo가 삭제되었습니다!');
  };

  // 모달 닫기
  const cancelDelete = () => setPendingDeleteId(null);

  // 토스트 헬퍼
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1600);
  };

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

  const openEdit = (item: Item) => {
    setEditing(item);
    setEditText(item.text);
  };

  const saveEdit = () => {
    if (!editing) return;
    const editedText = editText.trim();
    if (editedText.length < 3) {
      showToast('Type the memo with at least 3 letters');
      return;
    }

    // duplicate check
    const isDuplicate = items.some(i => i.id !== editing.id && normalize(i.text) === normalize(editedText));
    if (isDuplicate) {
      showToast('This memo already exists.');
      return;
    }
    
    setItems(prev => prev.map(i => (i.id === editing.id ? { ...i, text: editText } : i)));
    setEditing(null);
    setEditText('');
    Haptics.selectionAsync?.();
    showToast('Memo was edited!');
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditText('');
  }

  const filtered = useMemo(() => {
    const q = normalize(query);
    return q ? items.filter(i => normalize(i.text).includes(q)) : items;
  }, [items, query]);

  // const empty = useMemo(() => items.length === 0, [items.length]);
  const empty = useMemo(() => filtered.length === 0, [filtered.length]);

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

      <TextInput value={query} onChangeText={setQuery} placeholder='Search...' style={[styles.input, { marginTop: 4, alignSelf: 'stretch'}]} />

      {/* List */}
      <View style={{ alignSelf: 'stretch', marginTop: 16, flex: 1, maxHeight: 300}}>
        {empty ? (
          <View style={styles.emptyBox}>
            <Text style={{ color: '#777' }}>{query ? `No matches.` : 'List is empty. Add some items!'}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingHorizontal: 4}}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Pressable style={{ flex: 1 }} onLongPress={() => openEdit(item)}>
                  <Text>{item.text}</Text>
                </Pressable>
                <Pressable onPress={() => requestDelete(item.id)}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
      
      {/* 삭제 확인 모달 */}
      <Modal transparent visible={!!pendingDeleteId} animationType='fade' onRequestClose={cancelDelete}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Memo를 정말 삭제할까요?</Text>
            <Text style={styles.modalText}>삭제한 Memo는 되돌릴 수 없습니다.</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={cancelDelete}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalDanger]} onPress={confirmDelete}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Modal transparent visible={!!editing} animationType='slide' onRequestClose={cancelEdit}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Memo</Text>
            <Text style={styles.modalText}>Press Save after editing.</Text>

            <TextInput value={editText} onChangeText={(v) => setEditText(v.length <= MAX_LEN ? v : v.slice(0, MAX_LEN))}
              placeholder='Type the memo with at least 3 letters' style={[styles.input, { alignSelf: 'stretch'}]}
              autoFocus returnKeyType='done' onSubmitEditing={saveEdit} />
            <Text style={{ alignSelf: 'flex-end', color: '#777' }}>
              {editText.length} / {MAX_LEN}
            </Text> 

            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={cancelEdit}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalDanger]} onPress={saveEdit}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 토스트 */}
      { toast && (
        <View style={styles.toastWrap} pointerEvents='none'>
          <View style={styles.toastCard}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      )}
      
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
  delete: { color: '#d00', fontWeight: '700' },
  modalBackdrop: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalText: { color: '#555' },
  modalRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  modalCancel: { backgroundColor: '#eee' },
  modalDanger: { backgroundColor: '#c0392b' },
  modalBtnText: { fontWeight: '700' },

  toastWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 40,
    alignItems: 'center',
  },
  toastCard: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
  },
  toastText: { color: '#fff', fontWeight: '700'},
});