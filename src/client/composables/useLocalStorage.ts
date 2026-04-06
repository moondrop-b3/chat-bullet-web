import { ref, computed } from "vue";
import type { WritableComputedRef } from "vue";

type LocalStorage =
  | ["chatbullet_author", string]
  | ["chatbullet_color", string];

type LocalStorageKey = LocalStorage[0];
type LocalStorageValue<K extends LocalStorageKey> = Extract<LocalStorage, [K, unknown]>[1];

export function useLocalStorage<K extends LocalStorageKey>(
  key: K,
): WritableComputedRef<LocalStorageValue<K> | null> {
  const stored = ref<LocalStorageValue<K> | null>(
    localStorage.getItem(key) as LocalStorageValue<K> | null,
  );
  return computed({
    get: () => stored.value,
    set: (newVal) => {
      stored.value = newVal;
      localStorage.setItem(key, (newVal ?? "") as string);
    },
  });
}
