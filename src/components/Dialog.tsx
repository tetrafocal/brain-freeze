import {
  Component,
  createSignal,
  Ref,
  Show,
  Element as SolidElement,
} from "solid-js";

import { assignRef } from "../utils/assignRef";

import styles from "./Dialog.module.css";

export type DialogRef = {
  open: () => void;
  close: () => void;
};

export const Dialog: Component<{
  id: string;
  children: SolidElement | ((close: () => void) => SolidElement);

  contentClass?: string;
  additionalFooter?: SolidElement;

  ref?: Ref<DialogRef>;
  onClose?: () => void;
}> = (props) => {
  let dialogRef: HTMLDialogElement;

  // eslint-disable-next-line no-unassigned-vars
  let contentRef!: HTMLDivElement;

  const [atTop, setAtTop] = createSignal(true);
  const [atBottom, setAtBottom] = createSignal(true);

  const onScroll = (evt: Event) => {
    const target = evt.target as HTMLDivElement;
    setAtBottom(
      target.scrollHeight - 12 <= target.scrollTop + target.clientHeight,
    );
    setAtTop(target.scrollTop === 0);
  };

  const onOpenSelf = () => {
    dialogRef.showModal();
  };

  const onCloseSelf = () => {
    dialogRef.close();
  };

  return (
    <dialog
      ref={(dialogEl) => {
        dialogRef = dialogEl;
        assignRef(props.ref, {
          open: onOpenSelf,
          close: onCloseSelf,
        });
      }}
      id={props.id}
      class={styles.dialog}
      onClose={props.onClose}
    >
      <div class={styles.body}>
        <div
          ref={contentRef}
          onFocusIn={onScroll}
          on:scroll={onScroll}
          class={[
            styles.content,
            !atBottom() && styles.bottomGlow,
            !atTop() && styles.topGlow,
            props.contentClass,
          ]}
        >
          <Show
            when={typeof props.children === "function"}
            fallback={props.children as SolidElement}
          >
            {(props.children as (close: () => void) => SolidElement)(
              onCloseSelf,
            )}
          </Show>
        </div>
        <footer class={styles.footer}>
          <button class={styles.button} onClick={onCloseSelf}>
            Close
          </button>
          {props.additionalFooter}
        </footer>
      </div>
    </dialog>
  );
};
