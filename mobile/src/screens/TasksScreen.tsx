import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

type TasksNav = NativeStackNavigationProp<RootStackParamList, 'Tasks'>;

export function TasksScreen() {
  const navigation = useNavigation<TasksNav>();
  const { logout } = useAuth();

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

  return (
    <View style={styles.container}>
      <Text>
        Tela de Tarefas.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  logoutButton: { paddingHorizontal: 4 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
