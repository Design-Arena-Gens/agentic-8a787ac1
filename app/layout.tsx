export const metadata = {
  title: "Sassy Parrot",
  description: "Hyper-realistic sarcastic parrot performance"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0a", color: "#fff" }}>{children}</body>
    </html>
  );
}
