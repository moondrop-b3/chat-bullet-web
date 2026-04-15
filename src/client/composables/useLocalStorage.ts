import { ref, computed } from "vue";
import type { WritableComputedRef } from "vue";
import type { RapidStock } from "../../shared/types";

export type ViewConfig = {
  durationSec: number;
  fontSize: number;
  pinDurationSec: number;
  isForceColor: boolean;
  forcedColor: string;
};

type LocalStorageMap = {
  chatbullet_author: string;
  chatbullet_color: string;
  chatbullet_rapid_stocks: RapidStock[];
  chatbullet_view_config: ViewConfig;
};

type LocalStorageKey = keyof LocalStorageMap;

// 文字列として生値で保存するキー（JSONシリアライズなし）
const STRING_KEYS = [
  "chatbullet_author",
  "chatbullet_color",
] as const satisfies readonly LocalStorageKey[];
type StringKey = (typeof STRING_KEYS)[number];

function isStringKey(key: LocalStorageKey): key is StringKey {
  return (STRING_KEYS as readonly string[]).includes(key);
}

function readFromStorage<K extends LocalStorageKey>(
  key: K,
): LocalStorageMap[K] | null {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return null;
  }
  if (isStringKey(key)) {
    // isStringKey ガード済みのため string だが、インデックスアクセス型の制約で unknown 経由が必要
    return raw as unknown as LocalStorageMap[K];
  }
  try {
    // localStorage は外部データのため型を事前検証できない。インデックスアクセス型の制約で unknown 経由が必要
    return JSON.parse(raw) as unknown as LocalStorageMap[K];
  } catch {
    return null;
  }
}

export function useLocalStorage<K extends LocalStorageKey>(
  key: K,
): WritableComputedRef<LocalStorageMap[K] | null> {
  const stored = ref<LocalStorageMap[K] | null>(readFromStorage(key));
  return computed({
    get: () => stored.value,
    set: (newVal) => {
      stored.value = newVal;
      if (newVal === null) {
        localStorage.removeItem(key);
      } else if (isStringKey(key)) {
        // isStringKey ガード済みのため string であることが保証されている
        localStorage.setItem(key, newVal as string);
      } else {
        localStorage.setItem(key, JSON.stringify(newVal));
      }
    },
  });
}
