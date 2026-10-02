import { Button, Tooltip } from '@mantine/core';
import { IconMessageChatbot } from '@tabler/icons-react';

import { MOD_KEY } from '@/app/command/palette';

import { assistant, useAssistantState } from '../store';

/**
 * "Ask IrrigaIQ": the assistant's launcher, fixed to the bottom right of every page so it is always
 * in reach (hidden while the panel is open, which slides in from the same side).
 */
export function AskLauncher() {
  const { opened } = useAssistantState();
  if (opened) {
    return null;
  }
  return (
    <Tooltip label={`${MOD_KEY} J`} position="top" openDelay={400}>
      <Button
        className="app-ask-launcher"
        color="blue"
        radius="xl"
        size="md"
        leftSection={<IconMessageChatbot size={20} stroke={1.8} />}
        onClick={() => assistant.open()}
        aria-label={`Ask IrrigaIQ, the AI farm assistant (${MOD_KEY} J)`}
      >
        Ask IrrigaIQ
      </Button>
    </Tooltip>
  );
}
