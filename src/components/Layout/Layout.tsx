import type { ReactNode } from "react";
import Header from "./Header";
import Navigation from "./Navigation";

type LayoutProps = {
  children: ReactNode;
};

function Layout({ children }: LayoutProps) {
  return (
    <>
      <Header />
      <Navigation />
      <main className="main-content">
        {children}
      </main>
    </>
  );
}

export default Layout;