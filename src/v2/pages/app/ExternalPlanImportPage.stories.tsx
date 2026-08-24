import type { Meta, StoryObj } from '@storybook/react-vite'
import { mocked } from 'storybook/test'
import { LocalizedStory } from '../../../../.storybook/LocalizedStory'
import { QueryProvider } from '../../../platform/query/QueryProvider'
import {
  importExternalPlan,
  loadExternalPlanContext,
} from '../../external-plan/external-plan'
import { ExternalPlanImportPage } from './ExternalPlanImportPage'
import { momentumEvidence } from '../../../stories/product/coverage'

const contextFixture = {
  schema_version: '1.0.0' as const,
  requested_days: 7,
  output_schema: { type: 'object' },
  catalog: { release_id: 'momentum-core@v2', foods: [], ingredients: [], exercises: [], equipment_ids: [] },
  declared_allergen_ids: ['allergen:peanut@v2'],
  profile: { locale: 'en-US', display_name: 'Sara' },
  goal: { goal_type: 'fat_loss' },
  dietary: { allergies: ['peanut'] },
  health: { medical_considerations: [] },
  training: [],
}

const meta = {
  title: 'Screens/External plan import',
  component: ExternalPlanImportPage,
  beforeEach: () => {
    mocked(loadExternalPlanContext).mockResolvedValue(contextFixture)
    mocked(importExternalPlan).mockResolvedValue({
      import_id: '27bec751-3f64-4d14-9e8c-91c250c13f29',
      plan_id: '9432ca1e-04d2-466e-a1fd-957540381579',
      plan_version_id: '21df1910-5918-41e3-bfe8-b873de40a418',
      imported_at: '2026-08-24T12:00:00.000Z',
    })
  },
  decorators: [(Story, context) => (
    <LocalizedStory locale={context.globals.locale === 'en' ? 'en' : 'fa'}>
      <QueryProvider><Story /></QueryProvider>
    </LocalizedStory>
  )],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ExternalPlanImportPage>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {
  args: { locale: 'en' },
  parameters: momentumEvidence(['LIFE-21', 'LIFE-22', 'LIFE-23', 'LIFE-24'], '/[locale]/app/import-plan'),
  render: (_args, context) => <ExternalPlanImportPage locale={context.globals.locale === 'en' ? 'en' : 'fa'} />,
}
