import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ShellLayout from "@/components/layout/ShellLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nursery AI Logistics",
  description: "Gestisci il vivaio con la tua voce.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${inter.className} antialiased`}>
        <ShellLayout>
          {children}
        </ShellLayout>
      </body>
    </html>
  );
}
