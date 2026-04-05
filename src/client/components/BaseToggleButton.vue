<script setup lang="ts">
defineProps<{
  active: boolean;
  activeStyle?: string;
  inactiveStyle?: string;
}>();

defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    type="button"
    class="rounded px-2 py-0.5 text-xs cursor-pointer"
    :style="active ? activeStyle : inactiveStyle"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
