import {
  Component,
  createEffect,
  createMemo,
  createStore,
  flush,
  For,
  onSettled,
  reconcile,
  Show,
  Element as SolidElement,
  untrack,
  useContext,
} from "solid-js";

import {
  EmptyTransferResult,
  TransferGroup,
  TransferItem,
  TransferResult,
} from "../services/collateTransferResults";
import { SettingsStoreContext } from "../stores/SettingsStore";
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
    <article
      class={styles.group}
      style={{
        "view-transition-class": "tgroup",
        "view-transition-name": `tgroup-${props.group.username}-${props.group.sourcePath.length}-${props.group.items.length}`,
      }}
    >
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
            <Show
              when={props.item.transferStatus in statusTextMap}
              fallback={props.item.transferStatus}
            >
              {statusTextMap[props.item.transferStatus]}
            </Show>
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

  const [transfers, setTransfers] = createStore<TransferResult>(cache());

  const fetchTransfers = async () => {
    if (!settings.apiEndpoint || !settings.apiVersion) return;

    const previousFirstGroupFile = untrack(
      () => transfers.groups[0]?.items[0]?.filename,
    ) as string | undefined;

    const newTransfers = await fetcher(
      settings.apiEndpoint,
      settings.apiVersion,
    );

    setCache(newTransfers);

    if (
      // only trigger a view transition if the first group file has changed
      // as that indicates there's been a group move
      previousFirstGroupFile !== newTransfers.groups[0]?.items[0]?.filename &&
      document.startViewTransition
    ) {
      document.startViewTransition(() => {
        setTransfers(reconcile(newTransfers, "id"));
        flush();
      });
    } else {
      setTransfers(reconcile(newTransfers, "id"));
    }
  };

  const pollScheduler = transferPollScheduler(5 * 1000);
  onSettled(() => {
    fetchTransfers();
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
        pollScheduler.setDelay(30 * 1000);
      }

      let disposed = false;
      const timer = setTimeout(() => {
        if (disposed) return;
        fetchTransfers();
      }, pollScheduler.getDelay());

      return () => {
        disposed = true;
        clearInterval(timer);
      };
    },
  );

  return transfers;
}
