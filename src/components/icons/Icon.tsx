import { ClassList, Dynamic } from "@solidjs/web";
import { Component, ComponentProps } from "solid-js";

import type Play from "./lucide_play.svg";

import styles from "./Icon.module.css";
export type IconProps = ComponentProps<typeof Play>;

export const Icon: Component<{
  icon: Component<IconProps>;
  class?: string | Extract<ClassList, unknown[]>;
  additionalProps?: IconProps;
}> = (props) => {
  const classes = [styles.icon, ...stringOrArrayToClassList(props.class)];
  return (
    <Dynamic
      {...props.additionalProps}
      component={props.icon}
      class={[styles.icon, ...classes]}
    />
  );
};

function stringOrArrayToClassList(
  input: string | Extract<ClassList, unknown[]> | undefined,
): Extract<ClassList, unknown[]> {
  if (input === undefined) return [];

  if (typeof input === "string") {
    return input.split(" ").filter(Boolean) as Extract<ClassList, unknown[]>;
  }

  return input;
}
