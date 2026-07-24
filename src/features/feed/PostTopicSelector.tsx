import type { Topic } from '../../types/api'
import {
  MAX_SELECTED_TOPICS,
  type CreatePostErrors,
} from './createPostForm'
import { CreatePostFieldError } from './CreatePostField'

interface PostTopicSelectorProps {
  topics: Topic[]
  selectedTopicIds: number[]
  error?: CreatePostErrors['topicIds']
  busy: boolean
  onToggle: (topicId: number) => void
}

export function PostTopicSelector({
  topics,
  selectedTopicIds,
  error,
  busy,
  onToggle,
}: PostTopicSelectorProps) {
  return (
    <fieldset
      aria-invalid={Boolean(error)}
      aria-describedby={error ? 'post-topics-error' : 'post-topics-help'}
      tabIndex={error ? -1 : undefined}
      className="mt-6 border-0 p-0"
    >
      <legend className="text-sm font-semibold text-stone-800">
        Chủ đề <span aria-hidden="true">*</span>
        <span className="sr-only"> (bắt buộc)</span>
      </legend>
      <p id="post-topics-help" className="mt-1 text-xs text-stone-500">
        Chọn ít nhất 1 và tối đa {MAX_SELECTED_TOPICS} chủ đề phù hợp.
      </p>

      {topics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {topics.map((topic) => {
            const checked = selectedTopicIds.includes(topic.id)
            const limitReached =
              selectedTopicIds.length >= MAX_SELECTED_TOPICS
            const disabled = busy || (!checked && limitReached)

            return (
              <label
                key={topic.id}
                className={
                  disabled
                    ? 'cursor-not-allowed rounded-full border border-stone-200 bg-stone-100 px-3 py-2 text-sm text-stone-400 focus-within:ring-2 focus-within:ring-orange-700 focus-within:ring-offset-2'
                      : checked
                        ? 'cursor-pointer rounded-full border border-orange-700 bg-orange-700 px-3 py-2 text-sm font-semibold text-white focus-within:ring-2 focus-within:ring-orange-700 focus-within:ring-offset-2'
                      : 'cursor-pointer rounded-full border border-stone-500 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-orange-700 hover:bg-orange-50 focus-within:ring-2 focus-within:ring-orange-700 focus-within:ring-offset-2'
                }
              >
                <input
                  type="checkbox"
                  name="topicIds"
                  value={topic.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(topic.id)}
                  className="sr-only"
                />
                {topic.name}
              </label>
            )
          })}
        </div>
      ) : (
        <p role="status" className="mt-3 text-sm text-stone-600">
          Chưa có chủ đề để lựa chọn.
        </p>
      )}
      <CreatePostFieldError id="post-topics-error" message={error} />
    </fieldset>
  )
}
