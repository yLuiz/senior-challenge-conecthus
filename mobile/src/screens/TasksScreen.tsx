import { StyleSheet, Text, View } from 'react-native';

export function TasksScreen() {

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
});
