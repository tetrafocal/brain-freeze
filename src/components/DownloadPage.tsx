import {
  Component,
  createEffect,
  createMemo,
  For,
  Loading,
  Match,
  onSettled,
  refresh,
  Show,
  Switch,
  useContext,
} from "solid-js";

import { getDownloads } from "../services/api/download";
import {
  collateDownloadResults,
  DownloadGroup,
  DownloadItem,
  DownloadResult,
} from "../services/collateDownloadResults";
import { SettingsStoreContext } from "../stores/SettingsStore";
import { supportsSortTransfers } from "../utils/apiVersionUtil";
import { getFolderAndFileName } from "../utils/getFolderAndFileName";
import { transferPollScheduler } from "../utils/transferPollScheduler";
import { Icon, IconProps } from "./icons/Icon";
import Check from "./icons/lucide_check.svg";
import Clock from "./icons/lucide_clock.svg";
import Folder from "./icons/lucide_folder.svg";
import Pause from "./icons/lucide_pause.svg";
import Play from "./icons/lucide_play.svg";
import Triangle from "./icons/lucide_triangle_alert.svg";

import styles from "./DownloadPage.module.css";
import pageStyles from "./Page.module.css";

export const DownloadPage: Component = () => {
  const { store: settings } = useContext(SettingsStoreContext);
  const downloads = createMemo<DownloadResult | undefined>(
    async (prev = undefined) => {
      if (!settings.isApiEndpointHealthy) return prev;

      const rawDownloads = await getDownloads(
        settings.apiEndpoint,
        false,
        supportsSortTransfers(settings.apiVersion) ? false : undefined,
      );

      return collateDownloadResults(rawDownloads);
    },
  );

  const pollScheduler = transferPollScheduler(5 * 1000);
  onSettled(() => {
    return () => pollScheduler.dispose();
  });

  createEffect(
    () => [downloads()?.hasActiveDownloads, downloads()?.hasQueuedDownloads],
    ([hasActiveDownloads, hasQueuedDownloads]) => {
      if (hasActiveDownloads) {
        pollScheduler.setDelay(1.5 * 1000);
      } else if (hasQueuedDownloads) {
        pollScheduler.setDelay(10 * 1000);
      } else {
        pollScheduler.setDelay(60 * 1000);
      }

      const timer = setTimeout(() => {
        refresh(downloads);
      }, pollScheduler.getDelay());

      return () => clearTimeout(timer);
    },
  );

  return (
    <main class={pageStyles.page}>
      <h1>downloads</h1>
      <Loading>
        <Show when={downloads()}>
          {(downloads) => (
            <For each={downloads().groups}>
              {(item) => <DownloadGroupItem group={item()} />}
            </For>
          )}
        </Show>
      </Loading>
    </main>
  );
};

const DownloadGroupItem: Component<{ group: DownloadGroup }> = (props) => {
  const [, sourceParentFolder] = getFolderAndFileName(props.group.sourcePath);

  return (
    <article class={styles.group}>
      <header>
        <h2>
          <Icon icon={Folder} class={styles.prefixIcon} />/
          {props.group.username}/<strong>{sourceParentFolder}</strong>/
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
  DownloadItem["downloadStatus"],
  Component<IconProps>
> = {
  Finished: Check,
  Paused: Pause,
  Queued: Clock,
  Transferring: Play,
};

const Download: Component<{ item: DownloadItem }> = (props) => {
  const isProbablyErrorStatus = () =>
    props.item.downloadStatus.indexOf(" ") !== -1;

  const paddedProgress = () => props.item.progressPercentage.toFixed(1);

  return (
    <li class={styles.download}>
      <div class={styles.trackName} title={props.item.filename}>
        <Icon
          icon={statusIconMap[props.item.downloadStatus] || Triangle}
          class={styles.statusIcon}
        />
        {props.item.filename}
      </div>
      <Show when={props.item.downloadStatus !== "Finished"}>
        {
          <div class={styles.details}>
            <Show when={!isProbablyErrorStatus()}>
              <div class={styles.progressBar}>
                <div
                  class={styles.progress}
                  style={{ width: `${props.item.progressPercentage}%` }}
                ></div>
              </div>

              <span>{paddedProgress()}%</span>
            </Show>
            <Switch>
              <Match when={props.item.downloadStatus === "Paused"}>
                <span class={styles.statusText}>Paused</span>
              </Match>
              <Match when={props.item.downloadStatus === "Queued"}>
                <span class={styles.statusText}>Queued</span>
              </Match>
              <Match when={props.item.downloadStatus === "Transferring"}>
                <span class={styles.statusText}>Downloading</span>
              </Match>
              <Match when={isProbablyErrorStatus}>
                <span class={styles.statusText}>
                  <strong>{props.item.downloadStatus}</strong>
                </span>
              </Match>
            </Switch>
          </div>
        }
      </Show>
    </li>
  );
};
