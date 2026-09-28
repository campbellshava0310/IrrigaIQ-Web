import { Group, Kbd, Modal, Stack, Text } from '@mantine/core';

import { GO_SHORTCUTS, MOD_KEY } from './palette';

const GENERAL = [
  { keys: [MOD_KEY, 'K'], label: 'Search and run a command' },
  { keys: ['/'], label: 'Search and run a command' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['Esc'], label: 'Close a dialog or menu' },
];

function Row({ keys, label }: { keys: readonly string[]; label: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" py={6}>
      <Text size="sm">{label}</Text>
      <Group gap={4} wrap="nowrap">
        {keys.map((key, index) => (
          <Group key={`${key}-${index}`} gap={4} wrap="nowrap">
            {index > 0 && keys.length === 2 && keys[0] === 'g' && (
              <Text size="xs" c="dimmed">
                then
              </Text>
            )}
            <Kbd size="sm">{key}</Kbd>
          </Group>
        ))}
      </Group>
    </Group>
  );
}

export function ShortcutsModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title="Keyboard shortcuts" size="md">
      <Stack gap="lg">
        <div>
          <Text size="xs" fw={600} c="dimmed" mb={4}>
            General
          </Text>
          {GENERAL.map((shortcut) => (
            <Row key={shortcut.keys.join('+')} keys={shortcut.keys} label={shortcut.label} />
          ))}
        </div>
        <div>
          <Text size="xs" fw={600} c="dimmed" mb={4}>
            Go to
          </Text>
          {GO_SHORTCUTS.map((shortcut) => (
            <Row key={shortcut.key} keys={['g', shortcut.key]} label={shortcut.label} />
          ))}
        </div>
      </Stack>
    </Modal>
  );
}
