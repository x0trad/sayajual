import './globals.css';

export const metadata = {
  title: 'Sayajual',
  description: 'Turn your Threads post into a simple selling page',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
