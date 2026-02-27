import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Task, TaskStatus, RootStackParamList } from '../types';

import { useAuth } from '../context/AuthContext';
import { tasksApi } from '@/api/tasks';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await tasksApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setTasks(data);
    } catch {
      Alert.alert('Erro', 'Falha ao carregar tarefas');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks]),
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
    Alert.alert('Excluir Tarefa', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksApi.remove(id);
            setTasks((prev) => prev.filter((t) => t.id !== id));
          } catch {
            Alert.alert('Erro', 'Falha ao excluir tarefa');
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
        <Text style={styles.dueDate}>
          📅 {new Date(item.dueDate).toLocaleDateString('pt-BR')}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.deleteBtnText}>🗑️ Excluir</Text>
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
        onSubmitEditing={fetchTasks}
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
                fetchTasks();
              }}
              colors={['#6366f1']}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma tarefa encontrada</Text>
            </View>
          }
          contentContainerStyle={tasks.length === 0 ? { flex: 1 } : undefined}
        />
      )}

      {/* Implement CreateTaskScreen */}
      <TouchableOpacity
        style={styles.fab}
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
  dueDate: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  deleteBtn: { alignSelf: 'flex-end', marginTop: 10 },
  deleteBtnText: { color: '#dc2626', fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 60,
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
});
