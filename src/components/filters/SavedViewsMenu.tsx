import { ActionIcon, Button, Group, Menu, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBookmark, IconCheck, IconPlus, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { notifySuccess } from '@/lib/notify';

import { sameFilters, useSavedViews, type SavedView } from './savedViews';

interface SavedViewsMenuProps<T> {
  /** Where this list's saved views are kept, e.g. "alerts". */
  storageKey: string;
  /** Built-in views everyone gets. */
  presets: SavedView<T>[];
  current: T;
  onApply: (filters: T) => void;
}

/** Built-in and saved filter combinations for a list; saving names the current filters. */
export function SavedViewsMenu<T>({
  storageKey,
  presets,
  current,
  onApply,
}: SavedViewsMenuProps<T>) {
  const { views, save, remove } = useSavedViews<T>(storageKey);
  const [naming, naming$] = useDisclosure(false);
  const [name, setName] = useState('');
  const active = [...presets, ...views].find((view) => sameFilters(view.filters, current));

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    save(trimmed, current);
    notifySuccess(`Saved the view "${trimmed}"`);
    setName('');
    naming$.close();
  };

  const item = (view: SavedView<T>, removable: boolean) => (
    <Menu.Item
      key={view.id}
      onClick={() => onApply(view.filters)}
      rightSection={
        <Group gap={4} wrap="nowrap">
          {active?.id === view.id && <IconCheck size={14} />}
          {removable && (
            <ActionIcon
              component="span"
              size="xs"
              variant="subtle"
              color="gray"
              aria-label={`Delete the view ${view.name}`}
              onClick={(event) => {
                event.stopPropagation();
                remove(view.id);
              }}
            >
              <IconX size={12} />
            </ActionIcon>
          )}
        </Group>
      }
    >
      {view.name}
    </Menu.Item>
  );

  return (
    <>
      <Menu position="bottom-start" width={240}>
        <Menu.Target>
          <Button variant="default" size="sm" leftSection={<IconBookmark size={15} />}>
            {active ? active.name : 'Views'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Views</Menu.Label>
          {presets.map((view) => item(view, false))}
          {views.length > 0 && (
            <>
              <Menu.Divider />
              <Menu.Label>Saved in this browser</Menu.Label>
              {views.map((view) => item(view, true))}
            </>
          )}
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconPlus size={14} />}
            disabled={active != null}
            onClick={naming$.open}
          >
            Save current view…
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Modal opened={naming} onClose={naming$.close} title="Save view" size="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Keeps the current filters under a name, in this browser.
            </Text>
            <TextInput
              label="Name"
              placeholder="e.g. Pumps at risk"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              data-autofocus
              maxLength={40}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={naming$.close}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Save view
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
