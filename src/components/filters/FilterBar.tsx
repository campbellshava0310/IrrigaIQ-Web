import { Button, CloseButton, Group, Menu, Text, TextInput } from '@mantine/core';
import { IconCheck, IconChevronDown, IconSearch } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface FilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
  };
  /** FilterMenus, then a SavedViewsMenu. */
  children?: ReactNode;
  /** Shown when any filter is set: clears them all. */
  onReset?: () => void;
  /** Result count and display toggles, aligned right. */
  end?: ReactNode;
}

/** The one filter pattern on every list: search, filter menus, saved views, reset, count. */
export function FilterBar({ search, children, onReset, end }: FilterBarProps) {
  return (
    <Group justify="space-between" gap="sm" mb="md" wrap="wrap" role="search">
      <Group gap={8} wrap="wrap">
        {search && (
          <TextInput
            size="sm"
            w={{ base: '100%', xs: 240 }}
            placeholder={search.placeholder}
            aria-label={search.label}
            leftSection={<IconSearch size={15} />}
            value={search.value}
            onChange={(event) => search.onChange(event.currentTarget.value)}
            rightSection={
              search.value ? (
                <CloseButton
                  size="sm"
                  aria-label="Clear search"
                  onClick={() => search.onChange('')}
                />
              ) : null
            }
          />
        )}
        {children}
        {onReset && (
          <Button variant="subtle" color="gray" size="sm" onClick={onReset}>
            Reset
          </Button>
        )}
      </Group>
      {end && (
        <Group gap="sm" wrap="nowrap">
          {end}
        </Group>
      )}
    </Group>
  );
}

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterMenuProps<T extends string> {
  label: string;
  value: T | null;
  options: FilterOption<T>[];
  onChange: (value: T | null) => void;
  /** Label of the "no filter" choice; omit for filters that always have a value. */
  allLabel?: string;
}

/** A filter as a compact menu button: "Severity" when unset, "Severity: Critical" when set. */
export function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  allLabel,
}: FilterMenuProps<T>) {
  const selected = options.find((option) => option.value === value);
  const active = allLabel != null && selected != null;
  return (
    <Menu position="bottom-start" width={220}>
      <Menu.Target>
        <Button
          variant="default"
          size="sm"
          className="app-filter-chip"
          data-active={active || undefined}
          rightSection={<IconChevronDown size={14} />}
        >
          {label}
          {selected && (
            <Text span inherit fw={600} ml={6}>
              {selected.label}
            </Text>
          )}
          {!selected && allLabel && (
            <Text span inherit c="dimmed" fw={500} ml={6}>
              {allLabel}
            </Text>
          )}
        </Button>
      </Menu.Target>
      <Menu.Dropdown mah={360} style={{ overflowY: 'auto' }}>
        <Menu.Label>{label}</Menu.Label>
        {allLabel != null && (
          <Menu.Item
            onClick={() => onChange(null)}
            rightSection={value == null ? <IconCheck size={14} /> : null}
          >
            {allLabel}
          </Menu.Item>
        )}
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            onClick={() => onChange(option.value)}
            rightSection={option.value === value ? <IconCheck size={14} /> : null}
          >
            {option.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
