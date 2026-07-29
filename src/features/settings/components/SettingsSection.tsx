import type { ReactNode } from 'react'
import { IconTile } from '../../../components/ui/IconTile'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { Surface } from '../../../components/ui/Surface'

export function SettingsSection({
  children,
  description,
  eyebrow,
  icon,
  tone = 'accent',
  title,
}: {
  children?: ReactNode
  description?: ReactNode
  eyebrow: ReactNode
  icon: ReactNode
  tone?: 'accent' | 'highlight'
  title: ReactNode
}) {
  return (
    <Surface as="section" className="p-5 desktop:p-7">
      <SectionHeading
        description={description}
        eyebrow={eyebrow}
        icon={<IconTile tone={tone}>{icon}</IconTile>}
        title={title}
      />
      {children}
    </Surface>
  )
}
