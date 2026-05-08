import { Component, useContext } from "solid-js";

import { enqueueDownload } from "../services/api/transfer";
import { UserFile, UserResponse } from "../services/collateAllSearchResults";
import { SettingsStoreContext } from "../stores/SettingsStore";
import { assignRef } from "../utils/assignRef";
import { Dialog, DialogRef } from "./Dialog";

import dialogStyles from "./Dialog.module.css";

export type QueueDownloadDialogProps = {
  id: string;
  response: UserResponse;
  folderName: string;
  files: UserFile[];
  ref?: DialogRef;

  onClose?: () => void;
};

export const QueueDownloadDialog: Component<QueueDownloadDialogProps> = (
  props,
) => {
  const { store: settings } = useContext(SettingsStoreContext);

  let dialogRef!: DialogRef;

  const downloadFolder = async (username: string, files: UserFile[]) => {
    if (!settings.isApiEndpointHealthy) return;

    for (const file of files) {
      await enqueueDownload(settings.apiEndpoint, {
        username,
        virtual_path: file.fullPath,
        folder_path: settings.downloadFolder
          ? `${settings.downloadFolder}/${getParentFolder(file.fullPath)}`
          : undefined,
        bypass_filter: false,
        size: file.sizeInBytes,
        file_attributes: file.attributes,
      });
    }
  };

  const onDownload = async () => {
    await downloadFolder(props.response.username, props.files);
    dialogRef.close();
  };

  return (
    <Dialog
      id={props.id}
      ref={(dr) => {
        dialogRef = dr;
        assignRef(props.ref, dr);
      }}
      onClose={props.onClose}
      additionalFooter={
        <>
          <button
            class={[dialogStyles.button, dialogStyles.primary]}
            onClick={onDownload}
          >
            Download
          </button>
        </>
      }
    >
      <pre>Someday...</pre>
    </Dialog>
  );
};

function getParentFolder(filePath: string): string {
  const path = filePath.split(/[/\\]/);
  if (path.length < 2) return "";
  return path[path.length - 2];
}
