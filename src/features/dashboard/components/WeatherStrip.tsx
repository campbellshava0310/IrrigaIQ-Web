import { Badge, Box, Group, Paper, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconCloud, IconCloudRain, IconCloudStorm, IconSun } from '@tabler/icons-react';

import { formatDayMonth, formatNumber, formatWeekday } from '@/lib/format';

import type { WeatherDay } from '../types';

function expectedRain(day: WeatherDay): number {
  return (day.precipitationMm ?? 0) * ((day.precipitationProbability ?? 100) / 100);
}

function WeatherIcon({ day }: { day: WeatherDay }) {
  const rain = day.precipitationMm ?? 0;
  const chance = day.precipitationProbability ?? 0;
  if (rain >= 20 && chance >= 50) return <IconCloudStorm size={22} stroke={1.6} />;
  if (rain >= 2 && chance >= 40) return <IconCloudRain size={22} stroke={1.6} />;
  if (chance >= 25) return <IconCloud size={22} stroke={1.6} />;
  return <IconSun size={22} stroke={1.6} />;
}

interface WeatherStripProps {
  days: WeatherDay[];
  today: string;
  live: boolean;
  /** "strip" for wide areas; "list" (one row per day) for narrow columns. */
  layout?: 'strip' | 'list';
}

/**
 * Seven days at a glance, framed for irrigation: rain that will actually arrive (amount x chance)
 * and crop water demand (reference ET), not just temperatures.
 */
export function WeatherStrip({ days, today, live, layout = 'strip' }: WeatherStripProps) {
  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={650} fz="lg">
          Next 7 days
        </Text>
        <Tooltip
          label={
            live
              ? 'Open-Meteo forecast for the farm location, refreshed every few hours.'
              : 'Live forecast unavailable: showing seasonal averages for the location. Recommendations are marked lower confidence.'
          }
          multiline
          w={280}
        >
          <Badge variant="dot" color={live ? 'teal' : 'gray'} size="sm">
            {live ? 'Live forecast' : 'Seasonal estimate'}
          </Badge>
        </Tooltip>
      </Group>
      {layout === 'list' ? (
        <Stack gap={2}>
          {days.slice(0, 7).map((day) => {
            const isToday = day.date === today;
            const rain = expectedRain(day);
            return (
              <Group
                key={day.date}
                wrap="nowrap"
                gap="sm"
                py={6}
                px={8}
                style={{
                  borderRadius: 'var(--mantine-radius-sm)',
                  background: isToday ? 'var(--app-brand-soft)' : undefined,
                }}
              >
                <Text size="sm" fw={isToday ? 650 : 500} w={52}>
                  {isToday ? 'Today' : formatWeekday(day.date)}
                </Text>
                <Box c={rain >= 2 ? 'blue' : 'dimmed'} lh={0}>
                  <WeatherIcon day={day} />
                </Box>
                <Text size="sm" fw={600} w={64} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumber(day.tempMaxC)}°
                  <Text span size="xs" c="dimmed" fw={400}>
                    {' '}
                    {formatNumber(day.tempMinC)}°
                  </Text>
                </Text>
                <Text size="xs" c={rain >= 2 ? 'blue' : 'dimmed'} style={{ flex: 1 }}>
                  {formatNumber(day.precipitationMm ?? 0, 1)} mm
                  {day.precipitationProbability ? ` · ${day.precipitationProbability}%` : ''}
                </Text>
                <Tooltip label="Reference evapotranspiration: how fast a crop uses water">
                  <Text size="xs" c="dimmed">
                    ET₀ {formatNumber(day.et0Mm, 1)}
                  </Text>
                </Tooltip>
              </Group>
            );
          })}
        </Stack>
      ) : (
        <ScrollArea type="auto" offsetScrollbars>
          <Group gap={8} wrap="nowrap">
            {days.slice(0, 7).map((day) => {
              const isToday = day.date === today;
              const rain = expectedRain(day);
              return (
                <Paper
                  key={day.date}
                  withBorder
                  radius="md"
                  p="xs"
                  miw={84}
                  bg={isToday ? 'var(--app-brand-soft)' : undefined}
                  style={{ borderColor: isToday ? 'transparent' : undefined }}
                  aria-label={`${formatWeekday(day.date)}: ${formatNumber(day.tempMaxC)}° high, ${formatNumber(
                    rain,
                    1,
                  )} mm expected rain, ${formatNumber(day.et0Mm, 1)} mm crop demand`}
                >
                  <Stack gap={4} align="center">
                    <Text size="xs" fw={650}>
                      {isToday ? 'Today' : formatWeekday(day.date)}
                    </Text>
                    <Text size="10px" c="dimmed" lh={1}>
                      {formatDayMonth(day.date)}
                    </Text>
                    <Box c={rain >= 2 ? 'blue' : 'dimmed'}>
                      <WeatherIcon day={day} />
                    </Box>
                    <Text size="sm" fw={600} lh={1}>
                      {formatNumber(day.tempMaxC)}°
                      <Text span size="xs" c="dimmed" fw={400}>
                        {' '}
                        {formatNumber(day.tempMinC)}°
                      </Text>
                    </Text>
                    <Text size="xs" c={rain >= 2 ? 'blue' : 'dimmed'} lh={1.2}>
                      {formatNumber(day.precipitationMm ?? 0, 1)} mm
                      {day.precipitationProbability != null && day.precipitationProbability > 0
                        ? ` · ${day.precipitationProbability}%`
                        : ''}
                    </Text>
                    <Tooltip label="Reference evapotranspiration: how fast a crop uses water today">
                      <Text size="xs" c="dimmed" lh={1.2}>
                        ET₀ {formatNumber(day.et0Mm, 1)}
                      </Text>
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}
          </Group>
        </ScrollArea>
      )}
    </Stack>
  );
}
