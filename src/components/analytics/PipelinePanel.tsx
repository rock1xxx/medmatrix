import React from 'react'
import { GitBranch } from 'lucide-react'
import { Panel, PanelHeader, SegmentedBar } from './Panel'
import { StatusMeta } from '../../lib/analytics'

/**
 * Where the whole syllabus currently sits. A composition bar plus a ranked list
 * answers "how much is really done" in one glance — the old donut needed a legend
 * to be legible and implied the five slices were comparable quantities.
 */
export const PipelinePanel: React.FC<{
  pipeline: Array<StatusMeta & { count: number; share: number }>
  chapters: number
  className?: string
}> = ({ pipeline, chapters, className = '' }) => (
  <Panel className={className}>
    <PanelHeader
      icon={<GitBranch className="h-3.5 w-3.5" />}
      title="Pipeline"
      caption={`${chapters} chapters across five stages`}
    />

    <div className="px-4 pb-4">
      <SegmentedBar
        height={8}
        className="mb-3"
        segments={pipeline.map((stage) => ({
          key: stage.key,
          value: stage.count,
          color: stage.color,
        }))}
      />

      <ul className="space-y-[1px]">
        {pipeline.map((stage) => (
          <li
            key={stage.key}
            className="flex items-center gap-2.5 rounded-lg px-1 py-[5px] transition-colors hover:bg-white/[0.03]"
            title={stage.hint}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-zinc-400">
              {stage.label}
            </span>
            <span className="text-[11.5px] font-semibold text-zinc-200 tabular-nums">
              {stage.count}
            </span>
            <span className="w-9 text-right text-[10px] text-zinc-500 tabular-nums">
              {Math.round(stage.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  </Panel>
)
