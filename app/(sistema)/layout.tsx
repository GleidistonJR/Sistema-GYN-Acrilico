import Header from "@/app/(sistema)/components/Header";

export default function SistemaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {children}
      </main>
      {/* <Footer /> se você tiver um */}
    </>
  );
}