import { Component, For, Loading } from "solid-js";

import { getTransfers } from "../services/api/transfer";
import {
  collateTransferResults,
  TransferGroup,
} from "../services/collateTransferResults";
import { supportsSortTransfers } from "../utils/apiVersionUtil";
import { getFolderAndFileName } from "../utils/getFolderAndFileName";
import { Icon } from "./icons/Icon";
import ArrowRight from "./icons/lucide_arrow_right.svg";
import { TransferGroupItem, useTransfer } from "./Transfer";

import pageStyles from "./Page.module.css";
import transferStyles from "./Transfer.module.css";

export const UploadPage: Component = () => {
  const uploads = useTransfer({ cacheKey: "uploads", fetcher: fetchUploads });

  return (
    <main class={pageStyles.page}>
      <h1>uploads</h1>
      <Loading fallback={<p>loading...</p>}>
        <For each={uploads.groups}>
          {(group) => (
            <TransferGroupItem
              group={group()}
              header={<UploadGroupHeader group={group()} />}
            />
          )}
        </For>
      </Loading>
    </main>
  );
};

const UploadGroupHeader: Component<{ group: TransferGroup }> = (props) => {
  const folderParts = () => getFolderAndFileName(props.group.sourcePath);

  return (
    <>
      /{folderParts()[0]}/<strong>{folderParts()[1]}</strong>
      /
      <Icon icon={ArrowRight} class={transferStyles.directionIcon} />
      <strong>{props.group.username}</strong>
    </>
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
