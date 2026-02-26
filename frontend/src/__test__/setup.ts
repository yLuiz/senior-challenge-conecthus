import '@testing-library/jest-dom';
import { beforeAll, afterAll, vi } from 'vitest';

beforeAll(() => {
  // Captura as referências originais antes de mockar os console para evitar recursão infinita
  const _warn = console.warn.bind(console);
  const _info = console.info.bind(console);

  // Esconde os avisos de flags futuras do React Router v6 -> v7
  vi.spyOn(console, 'warn').mockImplementation((msg: string, ...args: unknown[]) => {
    if (typeof msg === 'string' && msg.includes('React Router Future Flag Warning')) return;
    _warn(msg, ...args);
  });

  // Esconde o console.info do hook useMqttNotifications para mensagens inválidas
  vi.spyOn(console, 'info').mockImplementation((msg: string, ...args: unknown[]) => {
    if (typeof msg === 'string' && msg.includes('[MQTT]')) return;
    _info(msg, ...args);
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
