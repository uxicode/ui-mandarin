<template>
  <div class="task-form">
    <h2 class="task-form__title">{{ isEditing ? '업무 수정' : '새 업무 추가' }}</h2>
    <form @submit.prevent="handleSubmit" class="task-form__form">
      <div class="task-form__field">
        <label class="task-form__label">제목 *</label>
        <input
          v-model="formData.title"
          type="text"
          class="task-form__input"
          placeholder="업무 제목을 입력하세요"
          required
        />
      </div>

      <div class="task-form__field">
        <label class="task-form__label">설명</label>
        <textarea
          v-model="formData.description"
          class="task-form__textarea"
          placeholder="업무 설명을 입력하세요 (선택사항)"
          rows="3"
          @paste="handlePaste"
          @blur="handleBlur"
        />
        <!-- URL 미리보기 티커들 -->
        <div v-if="urlPreviews.length > 0" class="task-form__previews">
          <div
            v-for="(preview, index) in urlPreviews"
            :key="preview.url"
            class="task-form__preview-ticker"
          >
            <a
              :href="preview.url"
              target="_blank"
              rel="noopener noreferrer"
              class="task-form__preview-ticker-link"
            >
              <div v-if="preview.image" class="task-form__preview-ticker-image">
                <img :src="preview.image" :alt="preview.title" />
              </div>
              <span class="task-form__preview-ticker-title">{{ preview.title }}</span>
            </a>
            <button
              class="task-form__preview-ticker-close"
              @click.stop="removeUrlPreview(index)"
              title="미리보기 제거"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="task-form__preview-ticker-close-icon"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="task-form__field">
        <label class="task-form__label">시작일시</label>
        <VueDatePicker
          v-model="formData.startDate"
          :enable-time-picker="true"
          :format="'yyyy년 MM월 dd일 HH:mm'"
          placeholder="시작일시를 선택하세요"
          auto-apply
          :clearable="true"
        />
      </div>

      <div class="task-form__field">
        <label class="task-form__label">마감일시</label>
        <VueDatePicker
          v-model="formData.deadline"
          :enable-time-picker="true"
          :format="'yyyy년 MM월 dd일 HH:mm'"
          placeholder="마감일시를 선택하세요"
          auto-apply
          :clearable="true"
        />
      </div>

      <div class="task-form__scores">
        <h3 class="task-form__scores-title">점수 입력</h3>
        <StarRating
          v-model:value="formData.scores.importance"
          label="중요도"
        />
        <StarRating
          v-model:value="formData.scores.urgency"
          label="시급성"
        />
      </div>

      <div class="task-form__actions">
        <button type="button" class="task-form__button task-form__button--cancel" @click="handleCancel">
          취소
        </button>
        <button type="submit" class="task-form__button task-form__button--submit">
          {{ isEditing ? '수정' : '추가' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import StarRating from './StarRating.vue'
import { apiService } from '@/services/api'
import type { Task, TaskScores } from '@/types/task'

interface Props {
  task?: Task
}

interface Emits {
  (e: 'submit', task: Omit<Task, 'id'>): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isEditing = computed(() => !!props.task)

const formData = ref<{
  title: string
  description?: string
  startDate?: Date | null
  deadline?: Date | null
  scores: TaskScores
}>({
  title: '',
  description: '',
  startDate: null,
  deadline: null,
  scores: {
    importance: 3,
    urgency: 3,
  },
})

const isFetchingTitle = ref(false)
const urlPreviews = ref<Array<{
  url: string
  title: string
  description?: string
  image?: string
}>>([])

// URL 감지 정규식
const URL_REGEX = /https?:\/\/[^\s]+/g

// URL 감지 함수 (모든 URL 반환)
function detectUrls(text: string): string[] {
  const matches = text.match(URL_REGEX)
  return matches || []
}

// 제목 가져오기 및 교체 함수 (여러 URL 처리)
async function fetchAndReplaceUrls(urls: string[]) {
  if (isFetchingTitle.value) return

  isFetchingTitle.value = true
  try {
    // 기존에 없는 URL만 처리
    const existingUrls = new Set(urlPreviews.value.map(p => p.url))
    const newUrls = urls.filter(url => !existingUrls.has(url))

    if (newUrls.length === 0) return

    // 모든 URL을 병렬로 처리
    const results = await Promise.all(
      newUrls.map(async (url) => {
        try {
          const result = await apiService.fetchUrlTitle(url)
          if (formData.value.description && result.title) {
            // URL을 제목으로 교체
            formData.value.description = formData.value.description.replace(url, result.title)
          }

          // 오픈그래프 정보가 있으면 미리보기 티커 추가
          if (result.openGraph) {
            return {
              url: url,
              title: result.openGraph.title || result.title,
              description: result.openGraph.description,
              image: result.openGraph.image,
            }
          } else {
            // 오픈그래프가 없어도 기본 정보로 미리보기 표시
            return {
              url: url,
              title: result.title,
              description: result.meta?.description,
            }
          }
        } catch (error) {
          console.error(`URL 제목 가져오기 실패 (${url}):`, error)
          return null
        }
      })
    )

    // 성공한 결과만 추가
    const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null)
    urlPreviews.value.push(...validResults)
  } catch (error) {
    console.error('URL 제목 가져오기 실패:', error)
  } finally {
    isFetchingTitle.value = false
  }
}

// URL 미리보기 제거 함수
function removeUrlPreview(index: number) {
  urlPreviews.value.splice(index, 1)
}

// 붙여넣기 이벤트 핸들러
async function handlePaste() {
  // 기본 붙여넣기 동작 후 URL 감지
  setTimeout(async () => {
    const text = formData.value.description || ''
    const urls = detectUrls(text)
    if (urls.length > 0) {
      await fetchAndReplaceUrls(urls)
    }
  }, 0)
}

// 포커스 해제 이벤트 핸들러
async function handleBlur() {
  const text = formData.value.description || ''
  const urls = detectUrls(text)
  if (urls.length > 0) {
    await fetchAndReplaceUrls(urls)
  }
}

watch(
  () => props.task,
  (task) => {
    if (task) {
      formData.value = {
        title: task.title,
        description: task.description || '',
        startDate: task.startDate ? new Date(task.startDate) : null,
        deadline: task.deadline ? new Date(task.deadline) : null,
        scores: { ...task.scores },
      }
      urlPreviews.value = []
    } else {
      formData.value = {
        title: '',
        description: '',
        startDate: null,
        deadline: null,
        scores: {
          importance: 3,
          urgency: 3,
        },
      }
      urlPreviews.value = []
    }
  },
  { immediate: true }
)

function handleSubmit() {
  emit('submit', {
    title: formData.value.title,
    description: formData.value.description || undefined,
    startDate: formData.value.startDate ? formData.value.startDate.toISOString() : undefined,
    deadline: formData.value.deadline ? formData.value.deadline.toISOString() : undefined,
    scores: formData.value.scores,
    completed: false,
  })
}

function handleCancel() {
  emit('cancel')
}
</script>


<style lang="scss" scoped>
.task-form {
  @include card;
  margin-bottom: $spacing-lg;
}

.task-form__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: $color-gray-900;
  margin-bottom: $spacing-lg;
}

.task-form__form {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.task-form__field {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.task-form__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-700;
}

.task-form__input,
.task-form__textarea {
  padding: $spacing-md;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 1rem;
  color: $color-gray-900;
  background: $color-white;
  transition: border-color 0.2s;

  &:focus {
    border-color: $color-primary;
  }

  &::placeholder {
    color: $color-gray-400;
  }
}

.task-form__textarea {
  resize: vertical;
  min-height: 80px;
}

.task-form__previews {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-top: $spacing-sm;
}

.task-form__preview-ticker {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 30px;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  transition: all 0.2s;
  overflow: hidden;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-sm;
  }
}

.task-form__preview-ticker-link {
  display: flex;
  align-items: center;
  height: 100%;
  text-decoration: none;
  color: inherit;
  padding: 0 $spacing-xs 0 0;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
}

.task-form__preview-ticker-image {
  width: 30px;
  height: 30px;
  min-width: 30px;
  overflow: hidden;
  background: $color-gray-100;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.task-form__preview-ticker-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-gray-900;
  padding: 0 $spacing-xs;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.task-form__preview-ticker-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  margin-right: $spacing-xs;
  background: transparent;
  border: none;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  &:hover {
    background: $color-gray-200;
  }
}

.task-form__preview-ticker-close-icon {
  width: 12px;
  height: 12px;
  color: $color-gray-600;
}

.task-form__scores {
  padding: $spacing-lg;
  background: $color-gray-50;
  border-radius: $radius-md;
}

.task-form__scores-title {
  font-size: 1rem;
  font-weight: 600;
  color: $color-gray-900;
  margin-bottom: $spacing-md;
}

.task-form__actions {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;
}

.task-form__button {
  padding: $spacing-md $spacing-lg;
  border-radius: $radius-md;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s;

  &--cancel {
    color: $color-gray-700;
    background: $color-gray-200;

    &:hover {
      background: $color-gray-300;
    }
  }

  &--submit {
    color: $color-white;
    background: $color-primary;

    &:hover {
      background: $color-primary-dark;
    }
  }
}

// Vue Datepicker 커스터마이징
:deep(.dp__input) {
  padding: $spacing-md;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 1rem;
  color: $color-gray-900;
  background: $color-white;

  &:focus {
    border-color: $color-primary;
  }

  &::placeholder {
    color: $color-gray-400;
  }
}

:deep(.dp__main) {
  font-family: inherit;
}

:deep(.dp__theme_light) {
  --dp-primary-color: #{$color-primary};
  --dp-primary-text-color: #{$color-white};
  --dp-hover-color: #{$color-gray-100};
  --dp-border-color: #{$color-gray-300};
}
</style>

