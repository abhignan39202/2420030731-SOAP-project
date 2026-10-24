import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";
import PortalGuard from "@/components/PortalGuard";

export const metadata: Metadata = {
  title: "Rural Health Companion - Telemedicine & Virtual Consultation",
  description: "Accessible rural healthcare companion providing seamless virtual consultations, appointments, and care management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-50 antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <PortalGuard>{children}</PortalGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
