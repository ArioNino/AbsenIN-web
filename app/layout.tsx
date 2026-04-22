import "./globals.css";

export const metadata = {
  title: "FaceAttend",
  description: "Dashboard Presensi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-[#F0F4FF] font-sans">
        {children}
      </body>
    </html>
  );
}