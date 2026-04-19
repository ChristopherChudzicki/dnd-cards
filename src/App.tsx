import { QueryProvider } from "./api/QueryProvider";
import { RouterProvider, router } from "./app/router";

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}
