import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Properties = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'sold':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                Our Properties
              </h1>
              <p className="text-lg text-muted-foreground">
                Explore our investment properties and join us in building wealth together
              </p>
            </div>
          </div>
        </section>

        {/* Properties Grid */}
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4">
            {properties.length === 0 ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
                  <p className="text-muted-foreground text-center">
                    Check back soon for exciting investment opportunities
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {property.image_url && (
                      <div className="aspect-video w-full overflow-hidden bg-muted">
                        <img
                          src={property.image_url}
                          alt={property.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-xl">{property.name}</CardTitle>
                        <Badge variant={getStatusColor(property.status)}>
                          {property.status}
                        </Badge>
                      </div>
                      {property.description && (
                        <CardDescription className="line-clamp-2">
                          {property.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {property.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{property.location}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        {property.purchase_price && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Purchase Price</p>
                            <p className="font-semibold text-sm">
                              ₦{Number(property.purchase_price).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {property.current_value && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                            <p className="font-semibold text-sm text-primary">
                              ₦{Number(property.current_value).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Ready to Start Building Wealth?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join WealthBuilders Cooperative today and start your journey to financial freedom
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/register" 
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
                >
                  Register Now
                </a>
                <a 
                  href="/about" 
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-11 px-8"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Properties;
