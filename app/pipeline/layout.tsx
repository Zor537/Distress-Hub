import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar variant="protected" />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
