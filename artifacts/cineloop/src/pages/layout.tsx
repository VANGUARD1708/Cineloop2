import AppHeader from "@/components/navigation/AppHeader";
import BottomNavbar from "@/components/navigation/BottomNavbar";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-black text-white min-h-screen">

      {/* Top Header */}
      <AppHeader />

      {/* Page Content */}
      <main className="pt-16 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNavbar />

    </div>
  );
}