import { createBrowserRouter, Outlet } from "react-router";
import { MainApp } from "./components/MainApp";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { Toaster } from "sonner";

function Root() {
  return (
    <>
      <Toaster position="top-right" theme="dark" />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: MainApp },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
    ],
  },
]);
