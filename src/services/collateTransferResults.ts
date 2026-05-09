import { getBasePathAndFileName } from "../utils/getFolderAndFileName";
import { Transfer, Transfers } from "./api/transfer";

export type TransferResult = {
  fetchedAt: number;
  activeOnly: boolean;
  fileCount: number;
  groupCount: number;
  hasActive: boolean;
  hasQueued: boolean;
  groups: TransferGroup[];
};

export type TransferGroup = {
  id: string;

  username: string;
  /**
   * Downloads:
   * physical target download folder,
   * assuming every download in a group goes to the same target folder
   *
   * Uploads:
   * physical path on the uploader's file system
   * the file is being uploaded from
   */
  targetPath: string;
  /**
   * virtual source path from uploader's file system
   */
  sourcePath: string;

  items: TransferItem[];
};

export type TransferItem = {
  id: string;

  filename: string;
  fullTargetPath: string;
  fullSourcePath: string;

  currentSpeed: number;
  averageSpeed: number;
  timeElapsed: number;
  timeLeft: number;
  progressPercentage: number;

  queuePosition: number;
  transferStatus: "Finished" | "Paused" | "Queued" | "Transferring" | string;
};

export type CollateOptions = {
  /**
   * @default true
   */
  sectionByStatus?: boolean;
};

export const EmptyTransferResult: TransferResult = {
  groups: [],
  activeOnly: false,
  fetchedAt: 0,
  fileCount: 0,
  groupCount: 0,
  hasActive: false,
  hasQueued: false,
};

export function collateTransferResults(
  transfers: Transfers,
  { sectionByStatus = true }: CollateOptions = {},
): TransferResult {
  const groups = new Map<string, TransferGroup>();
  const now = Date.now();
  let hasActive = false;
  let hasQueued = false;

  for (const transfer of transfers.items) {
    const { user, sourcePath, targetPath, filename } =
      transferGroupKey(transfer);
    const groupKey = `${user}-${sourcePath}-${targetPath}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: groupKey,
        username: user,
        sourcePath,
        targetPath,
        items: [],
      });
    }

    groups.get(groupKey)?.items.push({
      id: filename,
      filename,
      fullSourcePath: transfer.virtual_path,
      fullTargetPath: transfer.folder_path,
      currentSpeed: transfer.speed,
      averageSpeed: transfer.avg_speed,
      timeElapsed: transfer.time_elapsed,
      timeLeft: transfer.time_left,
      progressPercentage: transfer.progress_pct || 0,
      queuePosition: transfer.queue_position,
      transferStatus: transfer.status as Transfer["status"],
    });

    if (transfer.status === "Transferring") hasActive = true;
    if (transfer.status === "Queued") hasQueued = true;
  }

  const finalGroups = (() => {
    if (!sectionByStatus) {
      return Array.from(groups.values()).reverse();
    }

    const [active, completed] = groups.values().reduce(
      (acc, transfer) => {
        if (transfer.items.every((item) => item.transferStatus === "Finished"))
          acc[1].unshift(transfer);
        else acc[0].unshift(transfer);
        return acc;
      },
      [[] as TransferGroup[], [] as TransferGroup[]],
    );

    return active.concat(completed);
  })();

  return {
    fetchedAt: now,
    activeOnly: transfers.active_only,
    fileCount: transfers.count,
    groupCount: groups.size,
    groups: finalGroups,
    hasActive: hasActive,
    hasQueued: hasQueued,
  };
}

function transferGroupKey(transfer: Transfer): {
  user: string;
  sourcePath: string;
  targetPath: string;
  filename: string;
} {
  const [sourcePath, filename] = getBasePathAndFileName(transfer.virtual_path);
  const [targetPath] = getBasePathAndFileName(transfer.folder_path);

  return {
    user: transfer.username,
    sourcePath,
    targetPath,
    filename,
  };
}
