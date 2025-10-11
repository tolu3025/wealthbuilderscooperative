import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users, Target, Award, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import heroCommunity from "@/assets/hero-community.jpg";
import propertyInvestment from "@/assets/property-investment.jpg";
const Hero = () => {
  return <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-secondary">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img src={logo} alt="WealthBuilders Cooperative Logo" className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl animate-in fade-in zoom-in duration-700" />
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Build Wealth Together
            <span className="block mt-2 bg-gradient-to-r from-accent to-accent-light bg-clip-text text-amber-400">
              Grow Your Future
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Join Nigeria's premier multipurpose cooperative society. Save, invest, and build wealth with a community that cares about your financial future.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Link to="/register">
              <Button size="lg" className="bg-accent hover:bg-accent-light text-foreground font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Become a Member
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:text-primary font-semibold px-8 py-6 text-lg transition-all hover:scale-105 bg-[#000d00]/0">
                Member Login
              </Button>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105">
              <Shield className="h-12 w-12 text-accent mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Secure & Trusted</h3>
              <p className="text-white/80 text-sm">Your investments are safe with our regulated cooperative structure</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105">
              <TrendingUp className="h-12 w-12 text-accent mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Regular Dividends</h3>
              <p className="text-white/80 text-sm">Earn competitive returns on your capital contributions</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105">
              <Users className="h-12 w-12 text-accent mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Community First</h3>
              <p className="text-white/80 text-sm">Built by members, for members, with shared prosperity</p>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Building Wealth Through Community
                </h2>
                <p className="text-muted-foreground text-lg mb-6">
                  WealthBuilders Cooperative is Nigeria's premier multipurpose cooperative society,
                  dedicated to helping members achieve financial security through collective investment
                  and smart property acquisition.
                </p>
                <p className="text-muted-foreground mb-8">
                  With just ₦5,500 monthly, you're not just saving — you're investing in your future,
                  building capital, and earning dividends when our properties are sold at profit.
                </p>
                <Link to="/about">
                  <Button variant="outline" size="lg">
                    Learn More About Us
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <div className="relative">
                <img
                  src={heroCommunity}
                  alt="WealthBuilders Community"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground text-lg">Simple steps to start building your wealth</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background rounded-2xl p-8 shadow-elegant hover:scale-105 transition-transform">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Register & Join</h3>
                <p className="text-muted-foreground">
                  Sign up with your details and receive your unique member PIN via WhatsApp.
                  Use an invite code to help your referrer earn commission.
                </p>
              </div>

              <div className="bg-background rounded-2xl p-8 shadow-elegant hover:scale-105 transition-transform">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-6">
                  <span className="text-2xl font-bold text-secondary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Monthly Contributions</h3>
                <p className="text-muted-foreground">
                  Contribute ₦5,500 each month. ₦5,000 builds your capital and savings,
                  while ₦500 supports cooperative operations.
                </p>
              </div>

              <div className="bg-background rounded-2xl p-8 shadow-elegant hover:scale-105 transition-transform">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                  <span className="text-2xl font-bold text-accent">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Earn Dividends</h3>
                <p className="text-muted-foreground">
                  After 6 months and ₦50,000 capital, you're eligible for dividends when
                  properties are sold at profit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Showcase */}
      <div className="bg-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative order-2 md:order-1">
                <img
                  src={propertyInvestment}
                  alt="Property Investment"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Smart Property Investments
                </h2>
                <p className="text-muted-foreground text-lg mb-6">
                  Your contributions fund strategic property acquisitions across Nigeria.
                  When these properties are sold at profit, all eligible members receive
                  dividend payments proportional to their capital.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Target className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Strategic Selection</h4>
                      <p className="text-sm text-muted-foreground">
                        Properties chosen for high growth potential and market demand
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Award className="h-6 w-6 text-secondary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Competitive Returns</h4>
                      <p className="text-sm text-muted-foreground">
                        Earn dividends based on your capital contribution and tenure
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Handshake className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Transparent Process</h4>
                      <p className="text-sm text-muted-foreground">
                        Full visibility into investment decisions and financial performance
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-primary via-primary-dark to-secondary py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Start Building Your Future?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join hundreds of Nigerians who are already growing their wealth with WealthBuilders
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-accent hover:bg-accent-light text-foreground font-semibold px-8 py-6 text-lg">
                  Become a Member Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold px-8 py-6 text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default Hero;