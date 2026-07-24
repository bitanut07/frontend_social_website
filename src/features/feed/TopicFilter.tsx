import type { Topic } from '../../types/api'

interface TopicFilterProps {
  topics: Topic[]
  selectedTopicId: number | null
  onChange: (topicId: number | null) => void
}

export function TopicFilter({
  topics,
  selectedTopicId,
  onChange,
}: TopicFilterProps) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="sr-only">Lọc bảng tin theo chủ đề</legend>
      <div
        role="list"
        className="flex flex-wrap gap-2"
      >
        <div role="listitem">
          <button
            type="button"
            aria-pressed={selectedTopicId === null}
            onClick={() => onChange(null)}
            className={
              selectedTopicId === null
                ? 'rounded-full border border-orange-700 bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition-colors'
                : 'rounded-full border border-stone-500 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-orange-700 hover:bg-orange-50 hover:text-orange-800'
            }
          >
            Tất cả
          </button>
        </div>

        {topics.map((topic) => {
          const selected = topic.id === selectedTopicId

          return (
            <div role="listitem" key={topic.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(topic.id)}
                className={
                  selected
                    ? 'rounded-full border border-orange-700 bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition-colors'
                    : 'rounded-full border border-stone-500 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-orange-700 hover:bg-orange-50 hover:text-orange-800'
                }
              >
                {topic.name}
              </button>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
