import { Component, For, Loading, Match, Show, Switch } from "solid-js";

import { getTransfers } from "../services/api/transfer";
import {
  collateTransferResults,
  TransferGroup,
  TransferItem,
} from "../services/collateTransferResults";
import { supportsSortTransfers } from "../utils/apiVersionUtil";
import { getFolderAndFileName } from "../utils/getFolderAndFileName";
import { Icon, IconProps } from "./icons/Icon";
import ArrowRight from "./icons/lucide_arrow_right.svg";
import Check from "./icons/lucide_check.svg";
import Clock from "./icons/lucide_clock.svg";
import Folder from "./icons/lucide_folder.svg";
import Pause from "./icons/lucide_pause.svg";
import Play from "./icons/lucide_play.svg";
import Triangle from "./icons/lucide_triangle_alert.svg";
import { useTransfer } from "./Transfer";

import pageStyles from "./Page.module.css";
import transferStyles from "./Transfer.module.css";

export const UploadPage: Component = () => {
  const uploads = useTransfer({ cacheKey: "uploads", fetcher: fetchUploads });

  return (
    <main class={pageStyles.page}>
      <h1>uploads</h1>
      <Loading fallback={<p>loading...</p>}>
        <For each={uploads.groups}>
          {(group) => <UploadGroupItem group={group()} />}
        </For>
      </Loading>
    </main>
  );
};

const UploadGroupItem: Component<{ group: TransferGroup }> = (props) => {
  const folderParts = () => getFolderAndFileName(props.group.sourcePath);

  return (
    <article class={transferStyles.group}>
      <header>
        <h2>
          <Icon icon={Folder} class={transferStyles.prefixIcon} />/
          {folderParts()[0]}/<strong>{folderParts()[1]}</strong>
          /
          <Icon icon={ArrowRight} class={transferStyles.directionIcon} />
          <strong>{props.group.username}</strong>
        </h2>
      </header>
      <ul>
        <For each={props.group.items}>{(item) => <Upload item={item()} />}</For>
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

const Upload: Component<{ item: TransferItem }> = (props) => {
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

async function fetchUploads(apiEndpoint: string, apiVersion: string) {
  const rawUploads = await getTransfers(
    apiEndpoint,
    "uploads",
    false,
    supportsSortTransfers(apiVersion) ? false : undefined,
  );

  return collateTransferResults(rawUploads, {
    sectionByStatus: false,
    reverse: false,
  });
}
