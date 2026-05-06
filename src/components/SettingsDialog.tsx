import { Component, Show, useContext, createMemo} from "solid-js";

import { SettingsStoreContext } from "../stores/SettingsStore";
import { getApiVersion, minApiVersion } from "../api/health";
import { rescan } from "../api/rescan";
import { Dialog } from "./Dialog";

import formStyles from "./Form.module.css";
import styles from "./SettingsDialog.module.css";

export const SettingsDialog: Component<{ id: string; onClose?: () => void }> = (
  props,
) => {
  const { store, setStore } = useContext(SettingsStoreContext);
  const apiVersion = createMemo(async () => getApiVersion(store.apiEndpoint));
  return (
    <Dialog
      id={props.id}
      contentClass={styles.settingsDialogContent}
      onClose={props.onClose}
    >
      <label class={formStyles.multiline}>
        <span>API Endpoint</span>
        <div class={styles.endpointField}>
          <input
            type="text"
            name="apiEndpoint"
            placeholder="https://my-server:12339/"
            value={store.apiEndpoint}
            onBlur={(e) => {
              setStore((settings) => {
                settings.apiEndpoint = e.target.value;
              });
            }}
          />
          <Show when={apiVersion() !== "-1"}>
            <span
              class={styles.endpointValidIcon}
              aria-label="API endpoint is valid"
              title="API endpoint is valid">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          </Show>
        </div>
      </label>
      <label class={formStyles.multiline}>
        <span>Download Folder (full path)</span>
        <span class={formStyles.subtitle}>
          If you leave this blank, all downloaded files will be saved unsorted
          to the default download folder.
        </span>
        <input
          type="text"
          name="downloadFolder"
          placeholder="/path/to/download/folder/complete"
          value={store.downloadFolder}
          onBlur={(e) =>
            setStore((settings) => {
              settings.downloadFolder = e.target.value;
            })
          }
        />
      </label>
      <Show when={minApiVersion(apiVersion(), "1.1")}>
        <label class={formStyles.multiline}>
          <span>Rescan Files</span>
          <span class={formStyles.subtitle}> Triggers a rescan on the client.</span>
          <button class={styles.button} onClick={() => rescan(store.apiEndpoint)}>
            Rescan
          </button>
        </label>
      </Show>
    </Dialog>
  );
};
