import { Nav } from "@/widgets/marketing/ui/Nav";
import { Hero } from "@/widgets/marketing/ui/Hero";
import { Services } from "@/widgets/marketing/ui/Services";
import { Barbers } from "@/widgets/marketing/ui/Barbers";
import { Fragrances } from "@/widgets/marketing/ui/Fragrances";
import { Gallery } from "@/widgets/marketing/ui/Gallery";
import { Location } from "@/widgets/marketing/ui/Location";
import { Footer } from "@/widgets/marketing/ui/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Services />
        <Barbers />
        <Fragrances />
        <Gallery />
        <Location />
      </main>
      <Footer />
    </>
  );
}
