import { getSettings } from "@/lib/server-api";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { WhatsAppButton, ChatEmbed } from "@/components/store/FloatingWidgets";
import { Toaster } from "@/components/ui/sonner";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <AuthProvider>
    <StoreProvider>
      <div className="flex min-h-screen flex-col bg-white text-zinc-900">
        <Header settings={settings} />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
        <WhatsAppButton number={settings["whatsapp.number"] ?? null} message={settings["whatsapp.message"] ?? null} />
        <ChatEmbed code={settings["chat.embedCode"] ?? null} />
        <Toaster position="bottom-center" richColors />
      </div>
    </StoreProvider>
    </AuthProvider>
  );
}
