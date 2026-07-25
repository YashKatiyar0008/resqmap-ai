import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://resqmap-live-site.vercel.app"),
  title: "ResQMap AI — From Early Warning to Trusted Action",
  description: "Verified hazard intelligence, multilingual citizen alerts and ResQGuard safety validation for East Africa.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "ResQMap AI — From Early Warning to Trusted Action",
    description: "Know what is happening. Know whether it affects you.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ResQMap AI disaster intelligence for East Africa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ResQMap AI — From Early Warning to Trusted Action",
    description: "Know what is happening. Know whether it affects you.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
