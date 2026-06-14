import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Barbers } from "@/components/Barbers";
import { Fragrances } from "@/components/Fragrances";
import { Gallery } from "@/components/Gallery";
import { Location } from "@/components/Location";
import { Footer } from "@/components/Footer";

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
