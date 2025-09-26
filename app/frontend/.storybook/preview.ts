import type { Preview } from '@storybook/react';
import '../src/theme.css';
import '../src/components/ui/ui.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    a11y: {
      element: '#storybook-root'
    },
    layout: 'fullscreen'
  }
};

export default preview;
