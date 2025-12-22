import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Tienda Online",
  description: "Panel de administración",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
