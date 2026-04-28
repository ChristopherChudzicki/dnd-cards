import { QueryProvider } from "./api/QueryProvider";
import { RouterProvider, router } from "./app/router";
import { AuthProvider } from "./auth/AuthProvider";

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryProvider>
  );
}
