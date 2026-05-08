declare module "*.svg" {
  import { JSX } from "@solidjs/web/jsx-runtime";
  import type { Component } from "solid-js";
  const SVGComponent: Component<
    JSX.SvgSVGAttributes<SVGSVGElement> & JSX.Properties<SVGSVGElement>
  >;

  // @ts-ignore
  export default SVGComponent;
}
