import { Faqs } from '@/components/home/Faqs'
import { Hero } from '@/components/home/Hero'
import { Pricing } from '@/components/home/Pricing'
import { Reviews } from '@/components/home/Reviews'
import { SecondaryFeatures } from '@/components/home/SecondaryFeatures'
import { Footer } from '@/components/home/Footer'
import { Header } from '@/components/home/Header'

export default function HomePage() {
  return (
    <>
      <Header />
      <Hero />
      <SecondaryFeatures />
      <Reviews />
      <Pricing />
      <Faqs />
      <Footer />
    </>
  )
}
