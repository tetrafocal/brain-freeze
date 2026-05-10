import {
  Component,
  createEffect,
  createProjection,
  Element as SolidElement,
  isRefreshing,
  Match,
  onSettled,
  refresh,
  Show,
  Switch,
  useContext,
  For,
  createMemo,
} from "solid-js";

import {
  EmptyTransferResult,
  TransferGroup,
  TransferItem,
  TransferResult,
} from "../services/collateTransferResults";
import { SettingsStoreContext } from "../stores/SettingsStore";
import { safeRefresh } from "../utils/safeRefresh";
import { transferPollScheduler } from "../utils/transferPollScheduler";
import { useLocalStorage } from "../utils/useStorage";
import { Icon, IconProps } from "./icons/Icon";
import Check from "./icons/lucide_check.svg";
import Clock from "./icons/lucide_clock.svg";
import Folder from "./icons/lucide_folder.svg";
import Pause from "./icons/lucide_pause.svg";
import Play from "./icons/lucide_play.svg";
import Triangle from "./icons/lucide_triangle_alert.svg";

import styles from "./Transfer.module.css";

export const TransferGroupItem: Component<{
  group: TransferGroup;
  header: SolidElement;
}> = (props) => {
  const collapseFinishedItems = createMemo(() =>
    props.group.items.every((item) => item.transferStatus === "Finished"),
  );

  return (
    <article class={styles.group}>
      <h2>
        <Icon icon={Folder} class={styles.prefixIcon} />
        {props.header}
      </h2>
      <ul>
        <For each={props.group.items}>
          {(item) => (
            <Transfer
              item={item()}
              collapseFinishedItems={collapseFinishedItems()}
            />
          )}
        </For>
      </ul>
    </article>
  );
};

const statusIconMap: Record<
  TransferItem["transferStatus"],
  Component<IconProps>
> = {
  Finished: Check,
  Paused: Pause,
  Queued: Clock,
  Transferring: Play,
};

const statusTextMap: Record<TransferItem["transferStatus"], string> = {
  Paused: "Paused",
  Queued: "Queued",
  Transferring: "Downloading",
};

export const Transfer: Component<{
  item: TransferItem;
  collapseFinishedItems: boolean;
}> = (props) => {
  const isProbablyErrorStatus = () => props.item.transferStatus.includes(" ");
  const paddedProgress = () => props.item.progressPercentage.toFixed(1);

  return (
    <li class={styles.download}>
      <div class={styles.trackName} title={props.item.filename}>
        <Icon
          icon={statusIconMap[props.item.transferStatus] || Triangle}
          class={styles.statusIcon}
        />
        {props.item.filename}
      </div>
      <Show
        when={
          props.item.transferStatus !== "Finished" ||
          !props.collapseFinishedItems
        }
      >
        <div class={styles.details}>
          <Show
            when={!isProbablyErrorStatus() || props.item.progressPercentage > 0}
          >
            <div class={styles.progressBar}>
              <div
                class={styles.progress}
                style={{
                  "transform-origin": "left",
                  transform: `scaleX(${props.item.progressPercentage / 100.0})`,
                  "will-change": "transform",
                }}
              ></div>
            </div>
            <span>{paddedProgress()}%</span>
          </Show>
          <span class={styles.statusText}>
            <Switch fallback={<strong>{props.item.transferStatus}</strong>}>
              <Match when={props.item.transferStatus in statusTextMap}>
                {statusTextMap[props.item.transferStatus]}
              </Match>
            </Switch>
          </span>
        </div>
      </Show>
    </li>
  );
};

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
