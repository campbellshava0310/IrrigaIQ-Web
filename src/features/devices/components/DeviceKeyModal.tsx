import { Alert, Button, Code, CopyButton, Group, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCopy } from '@tabler/icons-react';

import { env } from '@/config/env';

import type { IssuedKey } from '../types';

function endpoint(): string {
  const base = env.apiBaseUrl.startsWith('http')
    ? env.apiBaseUrl
    : `${window.location.origin}${env.apiBaseUrl}`;
  return `${base}/telemetry`;
}

/** Shows a new device key once, with the request the device should send. */
export function DeviceKeyModal({
  issued,
  onClose,
}: {
  issued: IssuedKey | null;
  onClose: () => void;
}) {
  const example = issued
    ? [
        `curl -X POST ${endpoint()} \\`,
        `  -H "X-Device-Key: ${issued.deviceKey}" \\`,
        '  -H "Content-Type: application/json" \\',
        issued.device.type === 'FLOW_METER'
          ? `  -d '{"readings":[{"flowLpm":8.3}]}'`
          : issued.device.type === 'PUMP_MONITOR'
            ? `  -d '{"readings":[{"powerKw":11.2,"flowLpm":900,"vibrationMmS":2.4,"motorTempC":55}]}'`
            : `  -d '{"readings":[{"soilMoisturePct":31.5,"temperatureC":22.4}]}'`,
      ].join('\n')
    : '';

  return (
    <Modal
      opened={issued != null}
      onClose={onClose}
      title="Device key"
      centered
      size="lg"
      closeOnClickOutside={false}
    >
      {issued && (
        <Stack>
          <Alert
            variant="light"
            color="yellow"
            icon={<IconAlertTriangle size={18} />}
            title="Copy it now"
          >
            This key is shown once. IrrigaIQ keeps only a fingerprint of it; if it is lost, rotate
            the key and reflash the device.
          </Alert>
          <div>
            <Text size="sm" fw={500} mb={4}>
              {issued.device.name}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Code block style={{ flex: 1, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                {issued.deviceKey}
              </Code>
              <CopyButton value={issued.deviceKey}>
                {({ copied, copy }) => (
                  <Button
                    variant="default"
                    onClick={copy}
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>
              What the device sends
            </Text>
            <Text size="xs" c="dimmed" mb={6}>
              Readings go in the <Code>X-Device-Key</Code> header, not in the URL. Omit{' '}
              <Code>recordedAt</Code> to use the server&apos;s clock; up to 500 readings per
              request. The ESP32 sketch in the backend docs does this over Wi-Fi.
            </Text>
            <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {example}
            </Code>
          </div>
          <Group justify="flex-end">
            <Button onClick={onClose}>I have saved the key</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
