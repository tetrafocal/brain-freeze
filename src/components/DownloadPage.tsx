import {
  Component,
  createEffect,
  createProjection,
  For,
  isRefreshing,
  Loading,
  Match,
  onSettled,
  refresh,
  Show,
  Switch,
  useContext,
} from "solid-js";

import { getTransfers } from "../services/api/transfer";
import {
  collateTransferResults,
  EmptyTransferResult,
  TransferGroup,
  TransferItem,
  TransferResult,
} from "../services/collateTransferResults";
import { SettingsStoreContext } from "../stores/SettingsStore";
import { supportsSortTransfers } from "../utils/apiVersionUtil";
import { getFolderAndFileName } from "../utils/getFolderAndFileName";
import { transferPollScheduler } from "../utils/transferPollScheduler";
import { useLocalStorage } from "../utils/useStorage";
import { Icon, IconProps } from "./icons/Icon";
import Check from "./icons/lucide_check.svg";
import Clock from "./icons/lucide_clock.svg";
import Folder from "./icons/lucide_folder.svg";
import Pause from "./icons/lucide_pause.svg";
import Play from "./icons/lucide_play.svg";
import Triangle from "./icons/lucide_triangle_alert.svg";

import pageStyles from "./Page.module.css";
import transferStyles from "./Transfer.module.css";

export const DownloadPage: Component = () => {
  const { store: settings } = useContext(SettingsStoreContext);

  const [cache, setCache] = useLocalStorage<TransferResult>(
    "downloads",
    EmptyTransferResult,
  );

  const downloads = createProjection((prev) => {
    if (!isRefreshing() || !settings.apiEndpoint || !settings.apiVersion) {
      return prev;
    }

    return fetchDownloads(settings.apiEndpoint, settings.apiVersion).then(
      (downloads) => {
        setCache(downloads);
        return downloads;
      },
    );
  }, cache());

  const pollScheduler = transferPollScheduler(5 * 1000);
  onSettled(() => {
    // Solid 2.0 bug? refresh() called directly here triggers an unbounded-async-read warning
    // delaying it to the next microtask lets the existing boundaries take effect and prevent the issue
    queueMicrotask(() => refresh(downloads));
    return () => pollScheduler.dispose();
  });

  createEffect(
    () => [downloads.fetchedAt, downloads.hasActive, downloads.hasQueued],
    ([_fetchedAt, hasActiveDownloads, hasQueuedDownloads]) => {
      if (hasActiveDownloads) {
        pollScheduler.setDelay(1.5 * 1000);
      } else if (hasQueuedDownloads) {
        pollScheduler.setDelay(10 * 1000);
      } else {
        pollScheduler.setDelay(60 * 1000);
      }

      let disposed = false;
      const timer = setInterval(() => {
        if (disposed) return;
        refresh(downloads);
      }, pollScheduler.getDelay());

      return () => {
        disposed = true;
        clearInterval(timer);
      };
    },
  );

  return (
    <main class={pageStyles.page}>
      <h1>downloads</h1>
      <Loading>
        <For each={downloads.groups}>
          {(group) => <DownloadGroupItem group={group()} />}
        </For>
      </Loading>
    </main>
  );
};

const DownloadGroupItem: Component<{ group: TransferGroup }> = (props) => {
  const sourceParentFolder = () =>
    getFolderAndFileName(props.group.sourcePath)[1];

  return (
    <article class={transferStyles.group}>
      <header>
        <h2>
          <Icon icon={Folder} class={transferStyles.prefixIcon} />/
          {props.group.username}/<strong>{sourceParentFolder()}</strong>/
        </h2>
      </header>
      <ul>
        <For each={props.group.items}>
          {(item) => <Download item={item()} />}
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

const Download: Component<{ item: TransferItem }> = (props) => {
  const isProbablyErrorStatus = () =>
    props.item.transferStatus.indexOf(" ") !== -1;

  const paddedProgress = () => props.item.progressPercentage.toFixed(1);

  return (
    <li class={transferStyles.download}>
      <div class={transferStyles.trackName} title={props.item.filename}>
        <Icon
          icon={statusIconMap[props.item.transferStatus] || Triangle}
          class={transferStyles.statusIcon}
        />
        {props.item.filename}
      </div>
      <Show when={props.item.transferStatus !== "Finished"}>
        {
          <div class={transferStyles.details}>
            <Show when={!isProbablyErrorStatus()}>
              <div class={transferStyles.progressBar}>
                <div
                  class={transferStyles.progress}
                  style={{ width: `${props.item.progressPercentage}%` }}
                ></div>
              </div>

              <span>{paddedProgress()}%</span>
            </Show>
            <Switch>
              <Match when={props.item.transferStatus === "Paused"}>
                <span class={transferStyles.statusText}>Paused</span>
              </Match>
              <Match when={props.item.transferStatus === "Queued"}>
                <span class={transferStyles.statusText}>Queued</span>
              </Match>
              <Match when={props.item.transferStatus === "Transferring"}>
                <span class={transferStyles.statusText}>Downloading</span>
              </Match>
              <Match when={isProbablyErrorStatus}>
                <span class={transferStyles.statusText}>
                  <strong>{props.item.transferStatus}</strong>
                </span>
              </Match>
            </Switch>
          </div>
        }
      </Show>
    </li>
  );
};

async function fetchDownloads(
  apiEndpoint: string,
  apiVersion: string,
): Promise<TransferResult> {
  const rawDownloads = await getTransfers(
    apiEndpoint,
    "downloads",
    false,
    supportsSortTransfers(apiVersion) ? false : undefined,
  );
  return collateTransferResults(rawDownloads);
}
