import type { Meta, StoryObj } from '@storybook/react';
import { Icon, type IconName } from './Icon';

const iconOptions: IconName[] = [
  'dashboard',
  'sparkles',
  'send',
  'market',
  'shield',
  'settings',
  'bell',
  'arrowRight',
  'flame',
  'trendUp',
  'check',
  'repeat',
  'gift'
];

const meta: Meta<typeof Icon> = {
  title: 'Design System/Icon',
  component: Icon,
  argTypes: {
    name: {
      control: 'select',
      options: iconOptions
    },
    size: {
      control: { type: 'number', min: 12, max: 64, step: 2 }
    },
    label: {
      control: 'text'
    }
  },
  args: {
    name: 'sparkles',
    size: 24,
    label: 'Sparkles'
  }
};

export default meta;

type Story = StoryObj<typeof Icon>;

export const Playground: Story = {};

export const Accessible: Story = {
  args: {
    name: 'bell',
    label: 'Notification bell'
  }
};
