"use client";

import ClientSidebar from "@/components/ClientSidebar";
import NotificationCenter from "@/components/NotificationCenter";

export default function ClientNotificationsPage() {
  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#eef3f8_0%,#e3ebf5_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#071125_100%)]">
      <ClientSidebar />
      <main className="min-w-0 flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <NotificationCenter role="client" />
        </div>
      </main>
    </div>
  );
}
