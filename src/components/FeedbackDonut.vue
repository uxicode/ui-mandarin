<template>
  <div class="feedback-donut">
    <h4 class="feedback-donut__title">{{ title }}</h4>
    <p v-if="subtitle" class="feedback-donut__subtitle">{{ subtitle }}</p>
    <div class="feedback-donut__body">
      <svg
        class="feedback-donut__svg"
        :viewBox="`0 0 ${size} ${size}`"
        role="img"
        :aria-label="ariaLabel"
      >
        <g
          v-for="(seg, i) in drawableSegments"
          :key="seg.key + '-' + i"
          class="feedback-donut__segment-wrap"
        >
          <path
            :d="seg.path"
            :fill="seg.color"
            class="feedback-donut__segment"
            :class="{ 'feedback-donut__segment--active': selectedKey === seg.key }"
            stroke="var(--feedback-donut-stroke, #fff)"
            stroke-width="1"
            @click="onSegmentClick(seg.key)"
            @keydown.enter.prevent="onSegmentClick(seg.key)"
          />
        </g>
      </svg>
      <ul class="feedback-donut__legend" role="list">
        <li
          v-for="seg in legendItems"
          :key="seg.key"
          class="feedback-donut__legend-item"
        >
          <button
            type="button"
            class="feedback-donut__legend-btn"
            :class="{ 'feedback-donut__legend-btn--active': selectedKey === seg.key }"
            @click="onSegmentClick(seg.key)"
          >
            <span class="feedback-donut__swatch" :style="{ background: seg.color }" aria-hidden="true" />
            <span class="feedback-donut__legend-label">{{ seg.label }}</span>
            <span class="feedback-donut__legend-count">{{ seg.count }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface FeedbackDonutSegment {
  key: string
  label: string
  count: number
  color: string
}

const props = defineProps<{
  title: string
  subtitle?: string
  segments: FeedbackDonutSegment[]
  selectedKey?: string | null
}>()

const emit = defineEmits<{
  (e: 'segment-click', key: string): void
}>()

const size = 160
const cx = size / 2
const cy = size / 2
const rOuter = (size / 2) - 6
const rInner = rOuter - 26

function describeDonutSegment(
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const rad = (d: number) => (d * Math.PI) / 180
  const p1 = {
    x: cx + rOuter * Math.cos(rad(startAngleDeg)),
    y: cy + rOuter * Math.sin(rad(startAngleDeg)),
  }
  const p2 = {
    x: cx + rOuter * Math.cos(rad(endAngleDeg)),
    y: cy + rOuter * Math.sin(rad(endAngleDeg)),
  }
  const p3 = {
    x: cx + rInner * Math.cos(rad(endAngleDeg)),
    y: cy + rInner * Math.sin(rad(endAngleDeg)),
  }
  const p4 = {
    x: cx + rInner * Math.cos(rad(startAngleDeg)),
    y: cy + rInner * Math.sin(rad(startAngleDeg)),
  }
  const sweep = endAngleDeg - startAngleDeg
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`
}

/** 단일 비중 100%일 때 시작·끝 각이 같아 호 길이가 0이 되는 SVG 제한을 피하기 위해 180°씩 두 호로 링 전체를 그림 */
function describeFullDonutRing(key: string, color: string): { key: string; color: string; path: string } {
  const rad = (d: number) => (d * Math.PI) / 180
  const o1 = { x: cx + rOuter * Math.cos(rad(-90)), y: cy + rOuter * Math.sin(rad(-90)) }
  const o2 = { x: cx + rOuter * Math.cos(rad(90)), y: cy + rOuter * Math.sin(rad(90)) }
  const o3 = { x: cx + rOuter * Math.cos(rad(270)), y: cy + rOuter * Math.sin(rad(270)) }
  const i1 = { x: cx + rInner * Math.cos(rad(-90)), y: cy + rInner * Math.sin(rad(-90)) }
  const i2 = { x: cx + rInner * Math.cos(rad(90)), y: cy + rInner * Math.sin(rad(90)) }
  const i3 = { x: cx + rInner * Math.cos(rad(270)), y: cy + rInner * Math.sin(rad(270)) }
  const path = `M ${o1.x} ${o1.y} A ${rOuter} ${rOuter} 0 1 1 ${o2.x} ${o2.y} A ${rOuter} ${rOuter} 0 1 1 ${o3.x} ${o3.y} L ${i3.x} ${i3.y} A ${rInner} ${rInner} 0 1 0 ${i2.x} ${i2.y} A ${rInner} ${rInner} 0 1 0 ${i1.x} ${i1.y} Z`
  return { key, color, path }
}

const drawableSegments = computed(() => {
  const segs = props.segments.filter((s) => s.count > 0)
  const total = segs.reduce((a, s) => a + s.count, 0)

  if (total === 0 && props.segments.length > 0) {
    const s = props.segments[0]!
    return [
      {
        key: s.key,
        color: s.color,
        path: describeDonutSegment(-90, 270),
      },
    ]
  }

  if (total === 0) return []

  if (segs.length === 1) {
    const s = segs[0]!
    return [describeFullDonutRing(s.key, s.color)]
  }

  let cum = 0
  const out: { key: string; color: string; path: string }[] = []
  for (const s of segs) {
    const start = -90 + (360 * cum) / total
    cum += s.count
    const end = -90 + (360 * cum) / total
    out.push({
      key: s.key,
      color: s.color,
      path: describeDonutSegment(start, end),
    })
  }
  return out
})

const legendItems = computed(() => props.segments)

const ariaLabel = computed(() => {
  const parts = props.segments.map((s) => `${s.label} ${s.count}건`)
  return `${props.title}: ${parts.join(', ')}`
})

function onSegmentClick(key: string) {
  emit('segment-click', key)
}
</script>

<style lang="scss" scoped>
.feedback-donut {
  --feedback-donut-stroke: #{$color-white};
}

.feedback-donut__title {
  margin: 0 0 $spacing-xs;
  font-size: 0.8125rem;
  font-weight: 700;
  color: $color-gray-900;
  text-align: center;
}

.feedback-donut__subtitle {
  margin: 0 0 $spacing-sm;
  font-size: 0.6875rem;
  color: $color-gray-500;
  text-align: center;
  line-height: 1.35;
}

.feedback-donut__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
}

.feedback-donut__svg {
  width: min(100%, 168px);
  height: auto;
  display: block;
}

.feedback-donut__segment {
  cursor: pointer;
  transition: opacity 0.15s, filter 0.15s;

  &:hover {
    filter: brightness(1.08);
  }

  &--active {
    filter: brightness(0.92);
    opacity: 0.95;
  }
}

.feedback-donut__legend {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feedback-donut__legend-btn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  width: 100%;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: $radius-sm;
  background: transparent;
  font: inherit;
  font-size: 0.6875rem;
  color: $color-gray-700;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba($color-gray-200, 0.35);
  }

  &--active {
    border-color: $color-primary;
    background: rgba($color-primary-light, 0.12);
  }
}

.feedback-donut__swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.feedback-donut__legend-label {
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.feedback-donut__legend-count {
  font-weight: 700;
  color: $color-gray-900;
  flex-shrink: 0;
}
</style>
