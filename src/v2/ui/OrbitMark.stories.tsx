import type { Meta, StoryObj } from '@storybook/react-vite'
import { BrandLockup, OrbitMark } from './OrbitMark'
import './production-components.stories.css'

const meta = {
  title: 'Components/Brand mark',
  component: OrbitMark,
  args: {
    animated: false,
    size: 64,
  },
  argTypes: {
    size: { control: { min: 24, max: 160, step: 4, type: 'range' } },
  },
  parameters: {
    docs: {
      description: {
        component: 'The production Momentum Orbit mark and responsive brand lockups.',
      },
    },
  },
} satisfies Meta<typeof OrbitMark>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const SizesAndMotion: Story = {
  render: () => (
    <div className="storybook-stack mo-brand-stage">
      <OrbitMark size={32} />
      <OrbitMark size={48} />
      <OrbitMark size={72} />
      <OrbitMark animated size={96} />
    </div>
  ),
}

export const Lockups: Story = {
  render: () => (
    <div className="mo-component-column mo-brand-stage">
      <BrandLockup />
      <BrandLockup compact />
    </div>
  ),
}
