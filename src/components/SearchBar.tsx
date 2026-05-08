import {
  createOptimistic,
  For,
  Loading,
  onSettled,
  refresh,
  Show,
  useContext,
  type Component,
} from "solid-js";

import { getSearchHistory, HistoricalSearch } from "../services/api/search";
import { SearchStoreContext } from "../stores/SearchStore";
import { SettingsStoreContext } from "../stores/SettingsStore";
import { onVisible } from "../utils/onVisible";
import { Dialog } from "./Dialog";
import { FilterDialog } from "./FilterDialog";

import styles from "./SearchBar.module.css";

export const SearchBar: Component = () => {
  const { searchQuery, searchResults, enqueueSearch, isStreamingResults } =
    useContext(SearchStoreContext);

  const onSearch = (evt: SubmitEvent) => {
    evt.preventDefault();
    (document.activeElement as HTMLElement)?.blur();

    const form = evt.target as HTMLFormElement;
    const search = form.elements.namedItem("search") as
      | HTMLInputElement
      | undefined;

    const searchQuery = search?.value?.trim();
    if (!searchQuery) {
      return;
    }

    enqueueSearch(searchQuery);
  };

  return (
    <div class={[styles.searchBar, isStreamingResults() && styles.pendingGlow]}>
      <form class={styles.searchForm} method="dialog" onSubmit={onSearch}>
        <input
          class={styles.search}
          type="search"
          name="search"
          placeholder="Search..."
          enterkeyhint="search"
          value={searchQuery()}
        />
      </form>
      <div class={styles.moreRow}>
        <button
          class={styles.moreButton}
          command="show-modal"
          commandfor="history-dialog"
        >
          History
        </button>
        <button
          class={styles.moreButton}
          command="show-modal"
          commandfor="filter-dialog"
        >
          <span>Filters</span>
          <Loading>
            <Show
              when={
                searchResults()?.postfilterCount !==
                searchResults()?.prefilterCount
              }
            >
              <strong class={styles.filterCount}>
                &nbsp;({searchResults()?.postfilterCount}/
                {searchResults()?.prefilterCount})
              </strong>
            </Show>
          </Loading>
        </button>
      </div>

      <Dialog id="history-dialog">
        {(close) => (
          <Loading fallback={<pre>Loading...</pre>}>
            <SearchHistory onHistory={close} />
          </Loading>
        )}
      </Dialog>

      <FilterDialog id="filter-dialog" />
    </div>
  );
};

export const SearchHistory: Component<{
  onHistory?: () => void;
}> = (props) => {
  const { restoreExistingSearch } = useContext(SearchStoreContext);
  const { store: settings } = useContext(SettingsStoreContext);

  const [searchHistory, _setOptimisticSearchHistory] = createOptimistic<
    HistoricalSearch[]
  >((prev = []) => {
    if (!settings.isApiEndpointHealthy) {
      return prev;
    }

    return getSearchHistory(settings.apiEndpoint);
  });

  // eslint-disable-next-line no-unassigned-vars
  let historyListRef!: HTMLUListElement;
  onSettled(() => {
    return onVisible(historyListRef, () => {
      try {
        refresh(searchHistory);
      } catch {
        // in solid2 beta10, refresh throws the NotReadyError rather than swallowing it
        // it's a no-op
      }
    });
  });

  const onClick = (search: HistoricalSearch) => {
    restoreExistingSearch(search.query, search.token);
    props.onHistory?.();
  };

  return (
    <ul class={styles.searchHistory} ref={historyListRef}>
      <Loading>
        <For each={searchHistory()}>
          {(search) => (
            <li class={styles.searchHistoryLine}>
              <a href="#" onClick={() => onClick(search())}>
                {search().query} <em>{search().result_count} files</em>
              </a>
            </li>
          )}
        </For>
      </Loading>
    </ul>
  );
};
