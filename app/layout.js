import "./globals.css";

export const metadata = {
  title: "Lead Intake",
  description: "Real estate lead intake and AI memo extraction",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
