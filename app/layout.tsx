import "./globals.css";

export const metadata = {
  title: "Logic-X-Ray",
  description: "Visualize and analyze code logic",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: any) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
