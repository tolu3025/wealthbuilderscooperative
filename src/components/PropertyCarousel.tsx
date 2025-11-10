import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import propertyInvestment from "@/assets/property-investment.jpg";
import { MapPin } from "lucide-react";

const PropertyCarousel = () => {
  // Mock property data - can be replaced with real data from Supabase
  const properties = [
    {
      id: 1,
      image: propertyInvestment,
      title: "Acres of land in Osun State",
      location: "Osun State",
      price: "Available for sale"
    },
    {
      id: 2,
      image: propertyInvestment,
      title: "Plots of land in Abuja",
      location: "Abuja FCT",
      price: "Prime locations"
    },
    {
      id: 3,
      image: propertyInvestment,
      title: "Plots of land in Lagos State",
      location: "Lagos State",
      price: "Investment opportunities"
    },
    {
      id: 4,
      image: propertyInvestment,
      title: "Plots of land in Port Harcourt",
      location: "Port Harcourt",
      price: "Excellent ROI"
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Featured Properties
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Explore our premium land investment opportunities across Nigeria
            </p>
          </div>

          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-5xl mx-auto"
          >
            <CarouselContent>
              {properties.map((property) => (
                <CarouselItem key={property.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card className="overflow-hidden hover:shadow-lg transition-all">
                      <CardContent className="p-0">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            src={property.image}
                            alt={property.title}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                            <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4" />
                              <span>{property.location}</span>
                            </div>
                            <p className="text-accent font-medium mt-2">{property.price}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default PropertyCarousel;
