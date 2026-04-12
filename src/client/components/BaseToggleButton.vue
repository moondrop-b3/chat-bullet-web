<script setup lang="ts">
defineProps<{
  active: boolean;
}>();

defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    type="button"
    class="rounded px-2 py-0.5 text-xs cursor-pointer border"
    :class="
      active
        ? 'bg-cb-accent border-cb-accent text-cb-text-bright'
        : 'bg-cb-surface-2 border-cb-border text-cb-text-muted'
    "
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
