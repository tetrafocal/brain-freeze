import { Component, For, Loading } from "solid-js";

import { getTransfers } from "../services/api/transfer";
import {
  collateTransferResults,
  TransferGroup,
  TransferResult,
} from "../services/collateTransferResults";
import { supportsSortTransfers } from "../utils/apiVersionUtil";
import { getFolderAndFileName } from "../utils/getFolderAndFileName";
import { Icon } from "./icons/Icon";
import Folder from "./icons/lucide_folder.svg";
import { Transfer, TransferGroupItem, useTransfer } from "./Transfer";

import pageStyles from "./Page.module.css";
import transferStyles from "./Transfer.module.css";

export const DownloadPage: Component = () => {
  const downloads = useTransfer({
    cacheKey: "downloads",
    fetcher: fetchDownloads,
  });

  return (
    <main class={pageStyles.page}>
      <h1>downloads</h1>
      <Loading>
        <For each={downloads.groups}>
          {(group) => (
            <TransferGroupItem
              group={group()}
              header={<DownloadGroupHeader group={group()} />}
            />
          )}
        </For>
      </Loading>
    </main>
  );
};

const DownloadGroupHeader: Component<{ group: TransferGroup }> = (props) => {
  const sourceParentFolder = () =>
    getFolderAndFileName(props.group.sourcePath)[1];

  return (
    <>
      /{props.group.username}/<strong>{sourceParentFolder()}</strong>
    </>
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
