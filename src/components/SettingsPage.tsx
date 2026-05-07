import { Component, For, Show, createEffect, createMemo, useContext } from "solid-js";

import { getApiVersion, minApiVersion } from "../services/api/health";
import { rescan } from "../services/api/rescan";

import { SettingsStoreContext, themeMap } from "../stores/SettingsStore";
import formStyles from "./Form.module.css";
import pageStyles from "./Page.module.css";
import settingsPageStyles from "./SettingsPage.module.css";

export const SettingsPage: Component = () => {
  const { store, setStore } = useContext(SettingsStoreContext);
  const apiVersion = createMemo(async () => getApiVersion(store.apiEndpoint));
  createEffect(
    () => apiVersion(),
    () => {
      setStore((settings) => {
        settings.validApiEndpoint = apiVersion() !== "-1";
      });
    });
  return (
    <main class={pageStyles.page}>
       <label class={formStyles.multiline}>
        <span>API Endpoint {store.validApiEndpoint}</span>
        <div class={settingsPageStyles.endpointField}>
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
              class={settingsPageStyles.endpointIcon}
              style={{ color: "#2f9e44" }}
              aria-label="API endpoint is valid"
              title="API endpoint is valid">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          </Show>
          <Show when={apiVersion() === "-1"}>
            <span
              class={settingsPageStyles.endpointIcon}
              style={{ color: "#e03131" }}
              aria-label="API endpoint is invalid"
              title="API endpoint is invalid">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
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
      <label class={formStyles.multiline}>
        <span>Theme</span>
        <select
          name="theme"
          value={store.theme}
          onChange={(e) =>
            setStore((settings) => {
              settings.theme = e.target.value as keyof typeof themeMap;
            })
          }
        >
          <For each={Object.entries(themeMap)}>
            {keyMap => (
              <option value={keyMap()[0]}>
                {keyMap()[1]}
              </option>
            )}
          </For>
        </select>
      </label>
      <Show when={minApiVersion(apiVersion(), "1.1")}>
        <label class={formStyles.multiline}>
          <span>Rescan Files</span>
          <span class={formStyles.subtitle}> Triggers a rescan on the client.</span>
          <button class={settingsPageStyles.button} onClick={() => rescan(store.apiEndpoint)}>
            Rescan
          </button>
        </label>
      </Show>
    </main>
  )
}
