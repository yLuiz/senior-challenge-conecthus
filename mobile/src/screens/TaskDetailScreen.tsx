import React, { useState, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Task, TaskStatus } from '../types';
import { tasksApi } from '../api/tasks';
import { useAuth } from '../context/AuthContext';
import { mqttService } from '../../mqtt/mqttService';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;

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

export function TaskDetailScreen({ navigation, route }: Props) {
  const { taskId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Tasks');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      tasksApi
        .get(taskId)
        .then(setTask)
        .catch(() => {
          Alert.alert('Erro', 'Tarefa não encontrada');
          goBack();
        })
        .finally(() => setIsLoading(false));
    }, [taskId, navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      const unsubscribe = mqttService.onNotification(user.id, ({ event, taskId: notifTaskId }) => {
        if (notifTaskId !== taskId) return;
        if (event === 'TASK_DELETED') {
          goBack();
        } else if (event === 'TASK_UPDATED') {
          tasksApi.get(taskId).then(setTask).catch(goBack);
        }
      });
      return unsubscribe;
    }, [user?.id, taskId, navigation]),
  );

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Excluir Tarefa', 'Tem certeza que deseja excluir esta tarefa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksApi.remove(taskId);
            goBack();
          } catch {
            Toast.show({ type: 'error', text1: 'Falha ao excluir tarefa' });
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!task) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{task.title}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[task.status] }]}>
            <Text style={styles.badgeText}>{STATUS_LABELS[task.status]}</Text>
          </View>
        </View>

        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : (
          <Text style={styles.noDesc}>Sem descrição</Text>
        )}

        <View style={styles.meta}>
          {task.dueDate && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Vencimento:</Text>
              <Text style={styles.metaValue}>
                {task.dueDate.split('T')[0].split('-').reverse().join('/')}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Criada em:</Text>
            <Text style={styles.metaValue}>
              {new Date(task.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Atualizada:</Text>
            <Text style={styles.metaValue}>
              {new Date(task.updatedAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('CreateTask', { taskId: task.id })}
        >
          <View style={styles.btnContent}>
            <MaterialIcons name="edit" size={16} color="#fff" />
            <Text style={styles.editBtnText}>Editar Tarefa</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <View style={styles.btnContent}>
            <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
            <Text style={styles.deleteBtnText}>Excluir Tarefa</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    lineHeight: 26,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
  },
  noDesc: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  meta: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 13, color: '#6b7280' },
  metaValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  editBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
});
