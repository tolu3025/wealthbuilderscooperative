import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import propertyInvestment from "@/assets/property-investment.jpg";
import { MapPin } from "lucide-react";
const PropertyCarousel = () => {
  // Mock property data - can be replaced with real data from Supabase
  const properties = [{
    id: 1,
    image: propertyInvestment,
    title: "Acres of land in Osun State",
    location: "Osun State",
    price: "Available for sale"
  }, {
    id: 2,
    image: propertyInvestment,
    title: "Plots of land in Abuja",
    location: "Abuja FCT",
    price: "Prime locations"
  }, {
    id: 3,
    image: propertyInvestment,
    title: "Plots of land in Lagos State",
    location: "Lagos State",
    price: "Investment opportunities"
  }, {
    id: 4,
    image: propertyInvestment,
    title: "Plots of land in Port Harcourt",
    location: "Port Harcourt",
    price: "Excellent ROI"
  }];
  return <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        
      </div>
    </section>;
};
export default PropertyCarousel;