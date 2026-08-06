export type OfflineStatusListener = (offline: boolean) => void;

export function subscribeOfflineStatus(
  callback: OfflineStatusListener
) {
  const update = () => callback(!navigator.onLine);

  window.addEventListener("online", update);
  window.addEventListener("offline", update);

  update();

  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}
