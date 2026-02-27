import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Task, TaskStatus, RootStackParamList } from '../types';

import { useAuth } from '../context/AuthContext';
import { tasksApi } from '@/api/tasks';
import { mqttService } from '../../mqtt/mqttService';

type Props = NativeStackScreenProps<RootStackParamList, 'Tasks'>;

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Progresso',
  DONE: 'Concluída',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#6b7280',
  IN_PROGRESS: '#d97706',
  DONE: '#059669',
};

export function TasksScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');

  const pageRef = useRef(1);
  const PAGE_SIZE = 10;

  const fetchPage = useCallback(async (pageNum: number, mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const result = await tasksApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        page: pageNum,
        limit: PAGE_SIZE,
      });
      setTasks((prev) => mode === 'append' ? [...prev, ...result.data] : result.data);
      pageRef.current = pageNum;
      setHasMore(pageNum < result.meta.totalPages);
    } catch {
      Toast.show({ type: 'error', text1: 'Falha ao carregar tarefas' });
    } finally {
      if (mode === 'replace') {
        setIsLoading(false);
        setRefreshing(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [search, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchPage(1, 'replace');
    }, [fetchPage]),
  );

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchPage(pageRef.current + 1, 'append');
    }
  }, [isLoading, isLoadingMore, hasMore, fetchPage]);

  // Keep a ref so the MQTT callback always calls fetchPage(1, 'replace')
  // with current filters without re-subscribing on every filter change
  const fetchPageRef = useRef(fetchPage);
  useEffect(() => { fetchPageRef.current = fetchPage; }, [fetchPage]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      const unsubscribe = mqttService.onNotification(user.id, () => {
        fetchPageRef.current(1, 'replace');
      });
      return unsubscribe;
    }, [user?.id]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Sair',
              'Tem certeza que deseja sair?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: logout },
              ],
            )
          }
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, logout]);

  const handleDelete = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Excluir Tarefa', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksApi.remove(id);
            setTasks((prev) => prev.filter((t) => t.id !== id));
            Toast.show({ type: 'success', text1: 'Tarefa excluída!' });
          } catch {
            Toast.show({ type: 'error', text1: 'Falha ao excluir tarefa' });
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      {item.dueDate ? (
        <View style={styles.dueDateRow}>
          <MaterialIcons name="calendar-today" size={11} color="#9ca3af" />
          <Text style={styles.dueDate}>{new Date(item.dueDate).toLocaleDateString('pt-BR')}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id)}
      >
        <View style={styles.deleteBtnInner}>
          <MaterialIcons name="delete-outline" size={14} color="#dc2626" />
          <Text style={styles.deleteBtnText}>Excluir</Text>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar tarefas..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => fetchPage(1, 'replace')}
        returnKeyType="search"
      />

      {/* Status Filter */}
      <View style={styles.filters}>
        {(['', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterBtn, statusFilter === s && styles.filterBtnActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {s === '' ? 'Todos' : STATUS_LABELS[s as TaskStatus]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && !refreshing ? (
        <ActivityIndicator style={styles.loader} color="#6366f1" />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPage(1, 'replace');
              }}
              colors={['#6366f1']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma tarefa encontrada</Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator style={styles.loadingMore} color="#6366f1" />
            ) : null
          }
          contentContainerStyle={
            tasks.length === 0
              ? { flex: 1, paddingBottom: insets.bottom }
              : { paddingBottom: insets.bottom + 88 }
          }
        />
      )}

      {/* Implement CreateTaskScreen */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('CreateTask', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  searchInput: {
    margin: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 14,
    color: '#111827',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  filterBtnActive: { backgroundColor: '#6366f1' },
  filterText: { fontSize: 12, color: '#374151' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    margin: 12,
    marginTop: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  dueDate: { fontSize: 12, color: '#9ca3af' },
  deleteBtn: { alignSelf: 'flex-end', marginTop: 10 },
  deleteBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtnText: { color: '#dc2626', fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  logoutButton: { paddingHorizontal: 4 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  loadingMore: { paddingVertical: 16 },
});
