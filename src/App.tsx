import { HashRouter, Route } from "@solidjs/router";
import { Loading, ParentComponent, type Component } from "solid-js";

import { DownloadPage } from "./components/DownloadPage";
import { SearchBar } from "./components/SearchBar";
import { SearchResults } from "./components/SearchResults";
import { SettingsPage } from "./components/SettingsPage";
import { TabBar } from "./components/Tab";
import { UploadPage } from "./components/UploadPage";
import { FilterStoreProvider } from "./stores/FilterStore";
import { SearchStoreProvider } from "./stores/SearchStore";
import { SettingsStoreProvider } from "./stores/SettingsStore";

const Snapp: Component = () => {
  return (
    <HashRouter root={Base} explicitLinks={true}>
      <Route path="/" component={Search} />
      <Route path="/downloads" component={Downloads} />
      <Route path="/uploads" component={Uploads} />
      <Route path="/settings" component={Settings} />
    </HashRouter>
  );
};

const Base: ParentComponent = (props) => {
  return (
    <SettingsStoreProvider>
      <FilterStoreProvider>
        <SearchStoreProvider>
          {props.children}
          <TabBar />
        </SearchStoreProvider>
      </FilterStoreProvider>
    </SettingsStoreProvider>
  );
};

const Search: Component = () => {
  return (
    <>
      <Loading>
        <SearchBar />
        <SearchResults />
      </Loading>
    </>
  );
};

const Downloads: Component = () => {
  return <DownloadPage />;
};

const Uploads: Component = () => {
  return <UploadPage />;
};

const Settings: Component = () => {
  return <SettingsPage />;
};

export default Snapp;
