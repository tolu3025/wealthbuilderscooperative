import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Shield, 
  Wallet, 
  FileCheck,
  BarChart3,
  Globe,
  Handshake,
  CheckCircle
} from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: Building2,
      title: "Property Investment",
      description: "Strategic real estate investments in high-value properties worldwide, carefully vetted by legal experts.",
      features: [
        "Verified property acquisition",
        "Legal documentation and certification",
        "Professional property management",
        "Global market access"
      ]
    },
    {
      icon: TrendingUp,
      title: "Dividend Distribution",
      description: "Earn returns from property sales proportional to your capital contribution, creating passive income streams.",
      features: [
        "Fair profit sharing based on capital",
        "Regular dividend payouts",
        "Transparent calculation system",
        "Instant withdrawal access"
      ]
    },
    {
      icon: Wallet,
      title: "Savings Management",
      description: "Secure savings account with 20% of your monthly contribution, accessible after 3 months for emergencies.",
      features: [
        "Automatic savings allocation",
        "Emergency fund access",
        "Protected personal reserves",
        "Simple withdrawal process"
      ]
    },
    {
      icon: Users,
      title: "Cooperative Membership",
      description: "Join a community of wealth builders committed to financial growth through collective investment.",
      features: [
        "Affordable entry fee (₦5,000)",
        "Flexible monthly contributions",
        "Member support network",
        "Democratic governance"
      ]
    },
    {
      icon: FileCheck,
      title: "Financial Transparency",
      description: "Complete visibility into all cooperative transactions with professional auditing and accounting services.",
      features: [
        "Regular financial reports",
        "Independent auditing",
        "Real-time dashboard access",
        "Clear fund allocation"
      ]
    },
    {
      icon: Globe,
      title: "Global Real Estate Access",
      description: "Leverage our international partnerships to invest in properties across multiple markets and regions.",
      features: [
        "Worldwide property portfolio",
        "Diversified market exposure",
        "Professional estate consultants",
        "Strategic market analysis"
      ]
    }
  ];

  return (
    <div className="min-h-screen pt-16 md:pt-20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <Handshake className="h-12 w-12 md:h-16 md:w-16" />
              <h1 className="font-heading text-4xl md:text-6xl font-bold">
                Our Services
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Comprehensive financial services designed to build your wealth through cooperative property investment
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Become a Member Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              What We Offer
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the comprehensive services that make WealthBuilders the trusted choice for cooperative property investment
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="font-heading text-xl">
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {service.description}
                    </p>
                    <ul className="space-y-2">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              How Our Services Work
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A simple, transparent process from registration to returns
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Register</h3>
              <p className="text-muted-foreground text-sm">
                Join with a one-time fee of ₦5,000 and complete your profile
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Contribute</h3>
              <p className="text-muted-foreground text-sm">
                Pay ₦5,500 monthly - automatically split into capital and savings
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Invest</h3>
              <p className="text-muted-foreground text-sm">
                We pool funds to purchase verified properties worldwide
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="font-semibold text-lg mb-2">Earn</h3>
              <p className="text-muted-foreground text-sm">
                Receive dividends when properties sell and access savings after 3 months
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Partners */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Professional Partners
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We work with industry-leading firms to ensure security and success
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="font-heading">Legal Firm</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Investigates and certifies all property purchases for authenticity and legal compliance
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="font-heading">Real Estate Consultants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Handles property acquisition, advertising, and worldwide sales for maximum returns
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="font-heading">Financial Auditors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Independent auditing and accounting firms ensure transparent financial management
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Building Wealth?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of members who are already benefiting from our cooperative services
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Get Started Now
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 font-semibold">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;
