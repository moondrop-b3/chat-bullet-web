import { ref } from "vue";
import { useWebRTCSender } from "./useWebRTC";

export function useScreenShare(
  previewEl: Readonly<{ value: HTMLVideoElement | null }>,
  wsSend: (payload: unknown) => void,
  onStarted?: () => void,
) {
  const sharing = ref(false);
  const shareStatusText = ref("画面共有が開始されていません。");
  let localStream: MediaStream | null = null;

  const rtc = useWebRTCSender(
    () => localStream,
    (payload) => wsSend(payload),
  );

  async function startShare() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      shareStatusText.value = "このブラウザでは画面共有が利用できません。";
      return;
    }
    try {
      localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (previewEl.value) {
        previewEl.value.srcObject = localStream;
        await previewEl.value.play();
      }
      sharing.value = true;
      shareStatusText.value = "画面共有中です。視聴者の接続を待っています。";
      onStarted?.();
      await rtc.flushPendingViewers();
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "UnknownError";
      if (name === "NotAllowedError") {
        shareStatusText.value = "画面共有が拒否されました。";
      } else if (name === "NotFoundError") {
        shareStatusText.value = "共有する画面が見つかりません。";
      } else {
        shareStatusText.value = `画面共有を開始できませんでした。(${name})`;
      }
    }
  }

  function stopShare() {
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
    if (previewEl.value) previewEl.value.srcObject = null;
    rtc.closeAll();
    sharing.value = false;
    shareStatusText.value = "画面共有を停止しました。";
  }

  return { sharing, shareStatusText, startShare, stopShare, rtc };
}
