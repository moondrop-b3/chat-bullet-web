const RTC_CONFIG: RTCConfiguration = {
  iceServers: [],
};

/** Sender side (admin / share pages) */
export function useWebRTCSender(
  getStream: () => MediaStream | null,
  sendSignal: (payload: unknown) => void,
) {
  const peerConnections = new Map<string, RTCPeerConnection>();
  const pendingViewers = new Set<string>();

  async function createOffer(viewerId: string) {
    const stream = getStream();
    if (!stream) {
      pendingViewers.add(viewerId);
      return;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.set(viewerId, pc);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({
          type: "ice-candidate",
          target: "viewer",
          viewerId,
          candidate: e.candidate,
        });
      }
    };
    pc.onconnectionstatechange = () => {
      if (["closed", "failed", "disconnected"].includes(pc.connectionState)) {
        peerConnections.delete(viewerId);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ type: "offer", viewerId, offer });
  }

  async function handleAnswer(viewerId: string, answer: unknown) {
    const pc = peerConnections.get(viewerId);
    if (pc) await pc.setRemoteDescription(answer as RTCSessionDescriptionInit);
  }

  async function handleIceCandidate(viewerId: string, candidate: unknown) {
    const pc = peerConnections.get(viewerId);
    if (pc) await pc.addIceCandidate(candidate as RTCIceCandidateInit);
  }

  async function flushPendingViewers() {
    for (const viewerId of pendingViewers) {
      await createOffer(viewerId);
    }
    pendingViewers.clear();
  }

  function closeAll() {
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();
    pendingViewers.clear();
  }

  return {
    createOffer,
    handleAnswer,
    handleIceCandidate,
    flushPendingViewers,
    closeAll,
  };
}

/** Receiver side (view page) */
export function useWebRTCReceiver(
  sendSignal: (payload: unknown) => void,
  onStream: (stream: MediaStream) => void,
) {
  let pc: RTCPeerConnection | null = null;

  async function handleOffer(viewerId: string, offer: unknown) {
    if (!pc) {
      pc = new RTCPeerConnection(RTC_CONFIG);
      pc.ontrack = (e) => {
        if (e.streams[0]) onStream(e.streams[0]);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal({
            type: "ice-candidate",
            target: "sender",
            viewerId,
            candidate: e.candidate,
          });
        }
      };
    }
    await pc.setRemoteDescription(offer as RTCSessionDescriptionInit);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal({ type: "answer", viewerId, answer });
  }

  async function handleIceCandidate(candidate: unknown) {
    if (pc) await pc.addIceCandidate(candidate as RTCIceCandidateInit);
  }

  function close() {
    pc?.close();
    pc = null;
  }

  return { handleOffer, handleIceCandidate, close };
}
