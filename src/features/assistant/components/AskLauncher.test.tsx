import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { theme } from '@/app/theme';

import { assistant } from '../store';
import { AskLauncher } from './AskLauncher';

function renderLauncher() {
  return render(
    <MantineProvider theme={theme}>
      <AskLauncher />
    </MantineProvider>,
  );
}

describe('AskLauncher', () => {
  afterEach(() => act(() => assistant.close()));

  it('names the assistant and opens it', () => {
    renderLauncher();
    const button = screen.getByRole('button', { name: /Ask IrrigaIQ, the AI farm assistant/ });
    expect(button).toHaveTextContent('Ask IrrigaIQ');

    fireEvent.click(button);

    expect(screen.queryByRole('button', { name: /Ask IrrigaIQ/ })).toBeNull();
  });

  it('comes back when the panel closes', () => {
    act(() => assistant.open());
    renderLauncher();
    expect(screen.queryByRole('button', { name: /Ask IrrigaIQ/ })).toBeNull();

    act(() => assistant.close());

    expect(screen.getByRole('button', { name: /Ask IrrigaIQ/ })).toBeInTheDocument();
  });
});
