import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-secondary">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src={logo} 
              alt="WealthBuilders Cooperative Logo" 
              className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl animate-in fade-in zoom-in duration-700"
            />
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Build Wealth Together
            <span className="block mt-2 bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
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
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold px-8 py-6 text-lg transition-all hover:scale-105">
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
    </div>
  );
};

export default Hero;
