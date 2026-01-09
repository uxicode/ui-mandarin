<template>
  <div class="star-rating">
    <label class="star-rating__label">{{ label }}</label>
    <div class="star-rating__stars">
      <button
        v-for="star in 5"
        :key="star"
        type="button"
        class="star-rating__star"
        :class="{ 'star-rating__star--active': star <= value }"
        @click="handleClick(star)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="star-rating__icon"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      </button>
    </div>
    <span class="star-rating__value">{{ value }}/5</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  value: number
}

interface Emits {
  (e: 'update:value', value: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function handleClick(star: number) {
  emit('update:value', star)
}
</script>

<style lang="scss" scoped>
.star-rating {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-sm 0;
}

.star-rating__label {
  min-width: 120px;
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-gray-700;
}

.star-rating__stars {
  display: flex;
  gap: $spacing-xs;
}

.star-rating__star {
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.star-rating__icon {
  width: 24px;
  height: 24px;
  color: $color-gray-300;
  transition: color 0.2s;
}

.star-rating__star--active .star-rating__icon {
  color: $color-warning;
}

.star-rating__value {
  min-width: 40px;
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-600;
  text-align: right;
}
</style>

