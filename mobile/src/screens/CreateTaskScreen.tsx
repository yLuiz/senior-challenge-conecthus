import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, TaskStatus } from '../types';
import { tasksApi } from '../api/tasks';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTask'>;

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'A Fazer' },
  { value: 'IN_PROGRESS', label: 'Em Progresso' },
  { value: 'DONE', label: 'Concluída' },
];

// YYYY-MM-DD → DD/MM/YYYY
const isoToDisplay = (iso: string): string => {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
};

// DD/MM/YYYY → YYYY-MM-DD (retorna '' se incompleto)
const displayToISO = (display: string): string => {
  const parts = display.split('/');
  if (parts.length !== 3 || parts[2].length < 4) return '';
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
};

export function CreateTaskScreen({ navigation, route }: Props) {
  const taskId = route.params?.taskId;
  const isEditing = !!taskId;
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [dueDateDisplay, setDueDateDisplay] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTask, setIsLoadingTask] = useState(isEditing);

  useEffect(() => {
    if (!taskId) return;
    tasksApi
      .get(taskId)
      .then((task) => {
        setTitle(task.title);
        setDescription(task.description ?? '');
        setStatus(task.status);
        setDueDateDisplay(task.dueDate ? isoToDisplay(task.dueDate.split('T')[0]) : '');
      })
      .catch(() => {
        Alert.alert('Erro', 'Tarefa não encontrada');
        navigation.goBack();
      })
      .finally(() => setIsLoadingTask(false));
  }, [taskId, navigation]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título é obrigatório');
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        dueDate: displayToISO(dueDateDisplay) || undefined,
      };

      if (isEditing && taskId) {
        await tasksApi.update(taskId, payload);
      } else {
        await tasksApi.create(payload);
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Falha ao salvar tarefa');
    } finally {
      setIsLoading(false);
    }
  };

  // Aplica máscara DD/MM/AAAA conforme o usuário digita
  const handleDateTyping = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    setDueDateDisplay(masked);
  };

  // Data atual do picker: usa a data digitada ou hoje como fallback
  const getPickerDate = (): Date => {
    const iso = displayToISO(dueDateDisplay);
    if (iso) {
      const [yyyy, mm, dd] = iso.split('-').map(Number);
      return new Date(yyyy, mm - 1, dd);
    }
    return new Date();
  };

  const onPickerChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDueDateDisplay(`${day}/${month}/${year}`);
    }
  };

  if (isLoadingTask) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
      <View style={styles.form}>
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Estudar React Native"
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Detalhes da tarefa..."
          placeholderTextColor="#9ca3af"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.statusBtn,
                status === opt.value && styles.statusBtnActive,
              ]}
              onPress={() => setStatus(opt.value)}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  status === opt.value && styles.statusBtnTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Data de Vencimento</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#9ca3af"
            value={dueDateDisplay}
            onChangeText={handleDateTyping}
            keyboardType="number-pad"
            maxLength={10}
          />
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="calendar-today" size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <>
            <DateTimePicker
              value={getPickerDate()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onPickerChange}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.dateConfirmBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.dateConfirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Text>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20, gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textarea: { minHeight: 100 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  statusBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  statusBtnText: { fontSize: 13, color: '#374151' },
  statusBtnTextActive: { color: '#fff', fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  calendarBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
  },
  dateConfirmBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  dateConfirmBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelBtnText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
});
