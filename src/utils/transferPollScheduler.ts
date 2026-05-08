/**
 * Used for polling transfer endpoints, e.g. /downloads and /uploads.
 * We poll at different speeds depending on transfer status, whether there are any files actively downloading or uploading.
 * Due to sampling, we'll sometimes have a snapshot with active transfers followed by a snapshot with only queued files.
 * If we polled immediately after, we'd likely see new files start to download. However, as the snapshot only shows queued files,
 * we'd would normally slow down to a lower polling rate, delaying UI updates.
 *
 * `transferPollTimer` manages the polling rate, only allowing us to slow down (switch to a larger delay)
 * after a minimum time has passed, switchTimeMs.
 */
export function transferPollScheduler(
  switchTimeMs: number,
  initialDelay: number = Number.MAX_SAFE_INTEGER,
) {
  let currentDelay = initialDelay;

  let scheduledDelay: number | undefined;
  let timer: number | undefined;

  function getDelay() {
    return currentDelay;
  }

  function setDelay(newDelay: number) {
    if (newDelay < currentDelay) {
      dispose();
      currentDelay = newDelay;
      scheduledDelay = newDelay;
    } else if (newDelay >= currentDelay && newDelay !== scheduledDelay) {
      dispose();
      scheduledDelay = newDelay;
      timer = setTimeout(() => {
        if (scheduledDelay !== undefined) {
          currentDelay = scheduledDelay;
        }
      }, switchTimeMs);
    }
  }

  function dispose() {
    clearTimeout(timer);
    scheduledDelay = undefined;
    timer = undefined;
  }

  return {
    getDelay,
    setDelay,
    dispose,
  };
}
