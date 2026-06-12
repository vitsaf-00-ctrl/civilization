export const metadata = {
  title: "Civilization",
  description: "Браузерна стратегія в дусі Civilization 1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
