import type { Preview } from "@storybook/react-vite";
import { createElement } from "react";
import "../src/styles.css";

const preview: Preview = {
    parameters: {
        controls: { expanded: true },
    },
    // parameters.mobile = true mostra o componente como no celular (base de 20 px, coluna estreita).
    decorators: [
        (Story, context) =>
            context.parameters.mobile
                ? createElement(
                      "div",
                      { className: "sg-mobile", style: { maxWidth: "24rem", padding: "1rem" } },
                      createElement(Story),
                  )
                : createElement(Story),
    ],
};

export default preview;
