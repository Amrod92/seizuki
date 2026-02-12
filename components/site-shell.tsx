import { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export function SiteShell({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-5 py-6 sm:px-8 sm:py-10 lg:gap-10 lg:px-12 lg:py-14">
        <Navbar />
        {children}
        {!hideFooter ? <Footer /> : null}
      </div>
    </main>
  );
}
