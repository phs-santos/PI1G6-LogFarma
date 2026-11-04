import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { createQueryClient } from "./app/queryClient";
import { createAppRouter } from "./app/router";

export function App() {
    const [client] = useState(createQueryClient);
    const [router] = useState(createAppRouter);
    return (
        <QueryClientProvider client={client}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    );
}
