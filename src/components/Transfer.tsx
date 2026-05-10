import {
  createEffect,
  createProjection,
  isRefreshing,
  onSettled,
  refresh,
  useContext,
} from "solid-js";

import {
  EmptyTransferResult,
  TransferResult,
} from "../services/collateTransferResults";
import { SettingsStoreContext } from "../stores/SettingsStore";
import { safeRefresh } from "../utils/safeRefresh";
import { transferPollScheduler } from "../utils/transferPollScheduler";
import { useLocalStorage } from "../utils/useStorage";

export type UseTransferArgs = {
  cacheKey: string;
  fetcher: (apiEndpoint: string, apiVersion: string) => Promise<TransferResult>;
};

export function useTransfer({ cacheKey, fetcher }: UseTransferArgs) {
  const { store: settings } = useContext(SettingsStoreContext);

  const [cache, setCache] = useLocalStorage(cacheKey, EmptyTransferResult);

  const transfers = createProjection((prev) => {
    // if we're not in a refresh context, give a sync response
    // otherwise, let the fetcher handle it asynchronously
    if (!isRefreshing() || !settings.apiEndpoint || !settings.apiVersion) {
      return prev;
    }

    return fetcher(settings.apiEndpoint, settings.apiVersion).then((result) => {
      setCache(result);
      return result;
    });
  }, cache());

  const pollScheduler = transferPollScheduler(5 * 1000);
  onSettled(() => {
    // Solid 2.0 bug? refresh() called directly here triggers an unbounded-async-read warning
    // delaying it to the next microtask lets the existing boundaries take effect and prevent the issue
    queueMicrotask(() => refresh(transfers));
    return () => pollScheduler.dispose();
  });

  createEffect(
    () => [transfers.fetchedAt, transfers.hasActive, transfers.hasQueued],
    ([_fetchedAt, hasActiveUploads, hasQueuedUploads]) => {
      if (hasActiveUploads) {
        pollScheduler.setDelay(1.5 * 1000);
      } else if (hasQueuedUploads) {
        pollScheduler.setDelay(10 * 1000);
      } else {
        pollScheduler.setDelay(60 * 1000);
      }

      let disposed = false;
      const timer = setTimeout(() => {
        if (disposed) return;
        safeRefresh(transfers);
      }, pollScheduler.getDelay());

      return () => {
        disposed = true;
        clearInterval(timer);
      };
    },
  );

  return transfers;
}
