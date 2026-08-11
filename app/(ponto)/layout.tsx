import Header from "@/app/(ponto)/components/Header";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="bg-gray-200 min-h-screen">
        {children}
      </main>
    </>
  );
}