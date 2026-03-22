import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vehicle Planning Gantt",
  description: "Monthly gantt chart for vehicle scheduling"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={inter.className}>
      <body>
        <div className="app-container">
          <div className="app-main">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
