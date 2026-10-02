import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Drawer,
  Group,
  Kbd,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconArrowUp,
  IconCheck,
  IconMessageChatbot,
  IconMessagePlus,
  IconMinus,
  IconPlayerStopFilled,
  IconRefresh,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { MOD_KEY } from '@/app/command/palette';
import { useCurrentFarm } from '@/features/farms/currentFarm';

import { useAssistantStatus } from '../api';
import { assistant, useAssistantState } from '../store';
import type { ChatMessage, ToolActivity } from '../types';
import { useConversation } from '../useConversation';

import { Markdown } from './Markdown';

/**
 * The farm assistant: answers questions from the farm's live data, IrrigaIQ's models and a curated
 * knowledge base, streaming as it writes. Loaded on first open (⌘J / Ctrl J, the sidebar or the
 * palette) and kept mounted after, so the conversation survives closing the panel.
 */
export function AssistantDrawer() {
  const { opened, request } = useAssistantState();
  const { farm } = useCurrentFarm();
  const status = useAssistantStatus(farm?.id, opened);
  const conversation = useConversation(farm?.id);
  const phone = useMediaQuery('(max-width: 48em)');
  const [draft, setDraft] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const ready = (status.data?.configured ?? false) && !status.data?.problem;
  const local = status.data?.provider === 'OLLAMA';

  // "Ask about this" buttons elsewhere open the panel with a question.
  const { send } = conversation;
  useEffect(() => {
    if (opened && request && ready) {
      const pending = assistant.takeRequest();
      if (pending) send(pending.prompt);
    }
  }, [opened, request, ready, send]);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight });
  }, [conversation.messages]);

  const submit = () => {
    if (!draft.trim() || conversation.busy) return;
    conversation.send(draft);
    setDraft('');
  };

  return (
    <Drawer
      opened={opened}
      onClose={assistant.close}
      position="right"
      size={phone ? '100%' : 460}
      padding={0}
      withCloseButton={false}
      trapFocus
      returnFocus
      aria-label="Ask IrrigaIQ"
      styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') assistant.close();
      }}
    >
      <Group
        justify="space-between"
        px="md"
        py={12}
        wrap="nowrap"
        style={{ borderBottom: '1px solid var(--app-border)' }}
      >
        <Group gap={8} wrap="nowrap" miw={0}>
          <IconMessageChatbot size={20} stroke={1.8} color="var(--mantine-color-blue-filled)" />
          <Box miw={0}>
            <Text fw={600} lh={1.3}>
              IrrigaIQ
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {farm ? farm.name : 'Select a farm'}
            </Text>
          </Box>
        </Group>
        <Group gap={4} wrap="nowrap">
          <Tooltip label="New conversation">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={conversation.reset}
              disabled={conversation.messages.length === 0}
              aria-label="New conversation"
            >
              <IconMessagePlus size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={`Close (${MOD_KEY} J)`}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={assistant.close}
              aria-label="Close IrrigaIQ"
            >
              <IconX size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <ScrollArea viewportRef={viewport} style={{ flex: 1 }} px="md">
        <Stack
          gap="lg"
          py="md"
          role="log"
          aria-live="polite"
          aria-busy={conversation.busy}
          aria-label="Conversation"
        >
          {status.data && !status.data.configured && <NotConfigured />}
          {status.data?.configured && status.data.problem && (
            <NotReady onRetry={() => void status.refetch()} />
          )}
          {ready && conversation.messages.length === 0 && (
            <Welcome suggestions={status.data?.suggestions ?? []} onAsk={conversation.send} />
          )}
          {conversation.messages.map((message) =>
            message.role === 'user' ? (
              <UserMessage key={message.id} text={message.content} />
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                local={local}
                onRetry={conversation.retry}
              />
            ),
          )}
        </Stack>
      </ScrollArea>

      <Box px="md" pt="sm" pb="md" style={{ borderTop: '1px solid var(--app-border)' }}>
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <Textarea
            ref={input}
            style={{ flex: 1 }}
            autosize
            minRows={1}
            maxRows={6}
            maxLength={4000}
            placeholder="Ask IrrigaIQ about your fields, water or pumps…"
            aria-label="Your question"
            value={draft}
            disabled={!ready || !farm}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            data-autofocus
          />
          {conversation.busy ? (
            <ActionIcon
              size={36}
              variant="default"
              onClick={conversation.stop}
              aria-label="Stop answering"
            >
              <IconPlayerStopFilled size={16} />
            </ActionIcon>
          ) : (
            <ActionIcon
              size={36}
              onClick={submit}
              disabled={!draft.trim() || !ready}
              aria-label="Send question"
            >
              <IconArrowUp size={18} />
            </ActionIcon>
          )}
        </Group>
        <Text size="xs" c="dimmed" mt={6}>
          IrrigaIQ answers from this farm&apos;s live data and cited guidance, and can be wrong:
          check important decisions.
        </Text>
      </Box>
    </Drawer>
  );
}

function NotConfigured() {
  return (
    <Alert
      variant="light"
      color="gray"
      icon={<IconMessageChatbot size={18} />}
      title="Not set up yet"
    >
      Chat with IrrigaIQ hasn&apos;t been switched on for this workspace yet. Everything else works
      without it.
    </Alert>
  );
}

/** The server's detail names the model and its setup, so users get a plain status instead. */
function NotReady({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert
      variant="light"
      color="yellow"
      icon={<IconAlertTriangle size={18} />}
      title="IrrigaIQ is starting up"
    >
      <Text size="sm">It isn&apos;t ready to answer yet. Try again in a moment.</Text>
      <Button
        mt="sm"
        size="compact-sm"
        variant="default"
        leftSection={<IconRefresh size={14} />}
        onClick={onRetry}
      >
        Check again
      </Button>
    </Alert>
  );
}

function Welcome({ suggestions, onAsk }: { suggestions: string[]; onAsk: (text: string) => void }) {
  return (
    <Stack gap="md">
      <Box className="app-ai" p="md">
        <Text size="sm" lh={1.6}>
          IrrigaIQ is your AI farm assistant. Ask why a field needs water, whether water use looks
          abnormal, which pump needs attention, or for a weekly report. Answers are built from this
          farm&apos;s sensors, recommendations and models, with sources for general guidance.
        </Text>
      </Box>
      {suggestions.length > 0 && (
        <Stack gap={6}>
          <Text size="xs" fw={600} c="dimmed">
            Try asking
          </Text>
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="default"
              size="sm"
              fw={500}
              justify="flex-start"
              onClick={() => onAsk(suggestion)}
              styles={{ label: { whiteSpace: 'normal', textAlign: 'left' } }}
              h="auto"
              py={8}
            >
              {suggestion}
            </Button>
          ))}
          <Text size="xs" c="dimmed">
            <Kbd size="xs">{MOD_KEY}</Kbd> <Kbd size="xs">J</Kbd> opens this panel from anywhere.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <Box
      ml="xl"
      px="sm"
      py={8}
      style={{
        alignSelf: 'flex-end',
        background: 'var(--app-surface-muted)',
        border: '1px solid var(--app-border)',
        borderRadius: 'var(--mantine-radius-md)',
        whiteSpace: 'pre-wrap',
      }}
    >
      <Text size="sm">{text}</Text>
    </Box>
  );
}

const TOOL_ICON: Record<ToolActivity['state'], ReactNode> = {
  running: <Loader size={10} color="blue" />,
  done: <IconCheck size={12} color="var(--mantine-color-green-filled)" />,
  error: <IconAlertTriangle size={12} color="var(--mantine-color-yellow-filled)" />,
  skipped: <IconMinus size={12} color="var(--app-text-muted)" />,
};

function AssistantMessage({
  message,
  local,
  onRetry,
}: {
  message: ChatMessage;
  local: boolean;
  onRetry: () => void;
}) {
  const tools = message.tools ?? [];
  return (
    <Stack gap={8} mr="md">
      <Group gap={6} className="app-ai-label">
        <IconSparkles size={13} />
        IrrigaIQ
      </Group>
      {tools.length > 0 && (
        <Group gap={6}>
          {tools.map((tool) => (
            <Group
              key={tool.id}
              gap={6}
              wrap="nowrap"
              px={8}
              py={2}
              style={{
                border: '1px solid var(--app-border)',
                borderRadius: 999,
                background: 'var(--app-surface)',
              }}
            >
              {TOOL_ICON[tool.state]}
              <Text size="xs" c="dimmed">
                {tool.label}
              </Text>
            </Group>
          ))}
        </Group>
      )}
      {message.status === 'thinking' && !message.content && (
        <Group gap={8}>
          <Loader size={14} type="dots" color="blue" />
          <Text size="sm" c="dimmed">
            {tools.length ? 'Working through the data…' : 'Thinking…'}
            {local && ' This can take a minute.'}
          </Text>
        </Group>
      )}
      {message.content && <Markdown text={message.content} />}
      {message.status === 'stopped' && (
        <Text size="xs" c="dimmed">
          Stopped.
        </Text>
      )}
      {message.notice && (
        <Text size="xs" c="dimmed">
          {message.notice}
        </Text>
      )}
      {message.sources && message.sources.length > 0 && (
        <Box pt={4}>
          <Text size="xs" fw={600} c="dimmed" mb={2}>
            Sources
          </Text>
          <Stack gap={2}>
            {message.sources.map((source) => (
              <Text key={source.title} size="xs" c="dimmed">
                {source.url ? (
                  <Anchor href={source.url} target="_blank" rel="noopener noreferrer" inherit>
                    {source.title}
                  </Anchor>
                ) : (
                  source.title
                )}
                {source.publisher ? ` · ${source.publisher}` : ''}
              </Text>
            ))}
          </Stack>
        </Box>
      )}
      {message.status === 'error' && (
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertTriangle size={16} />}
          p="sm"
          title={message.error ?? 'The answer failed'}
        >
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconRefresh size={14} />}
            onClick={onRetry}
          >
            Try again
          </Button>
        </Alert>
      )}
    </Stack>
  );
}
