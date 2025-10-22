import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import heroMain from "@/assets/hero-main.jpg";
const Hero = () => {
  const [stats, setStats] = useState({
    memberCount: 0,
    totalCapital: 0,
    propertiesCount: 0
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch member count
        const {
          count: memberCount
        } = await supabase.from('profiles').select('*', {
          count: 'exact',
          head: true
        });

        // Fetch total capital from contributions
        const {
          data: contributions
        } = await supabase.from('contributions').select('capital_amount');
        const totalCapital = contributions?.reduce((sum, c) => sum + Number(c.capital_amount), 0) || 0;

        // Fetch properties count
        const {
          count: propertiesCount
        } = await supabase.from('properties').select('*', {
          count: 'exact',
          head: true
        });
        setStats({
          memberCount: memberCount || 0,
          totalCapital,
          propertiesCount: propertiesCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);
  return <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img src={heroMain} alt="WealthBuilders Community" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-secondary/85" />
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{
          animationDelay: '1s'
        }} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              {/* Logo */}
              <div className="mb-6 md:mb-8 flex justify-center animate-fade-in">
                <img src={logo} alt="WealthBuilders Cooperative" className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 drop-shadow-2xl" />
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 md:mb-6 animate-fade-in" style={{
              animationDelay: '0.1s'
            }}>
                Build Wealth Together
                <span className="block mt-2 text-accent">
                  Grow Your Future
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-8 md:mb-12 max-w-3xl mx-auto px-4 animate-fade-in" style={{
              animationDelay: '0.2s'
            }}>
                Join Nigeria's premier multipurpose cooperative society. Save, invest, and build wealth 
                with a community that cares about your financial future.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 md:mb-16 px-4 animate-fade-in" style={{
              animationDelay: '0.3s'
            }}>
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent-light text-foreground font-semibold px-6 md:px-8 py-5 md:py-6 text-base md:text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    Become a Member
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-white hover:text-primary font-semibold px-6 md:px-8 py-5 md:py-6 text-base md:text-lg transition-all hover:scale-105 bg-white/0">
                    Member Login
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              {!loading && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto px-4 animate-fade-in" style={{
              animationDelay: '0.4s'
            }}>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20">
                    <div className="text-2xl md:text-4xl font-bold text-accent mb-1 md:mb-2">
                      {stats.memberCount}+
                    </div>
                    <div className="text-xs md:text-sm text-white/80">Active Members</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20">
                    <div className="text-2xl md:text-4xl font-bold text-accent mb-1 md:mb-2">
                      ₦{(stats.totalCapital / 1000000).toFixed(1)}M+
                    </div>
                    <div className="text-xs md:text-sm text-white/80">Total Capital</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20">
                    <div className="text-2xl md:text-4xl font-bold text-accent mb-1 md:mb-2">
                      {stats.propertiesCount}+
                    </div>
                    <div className="text-xs md:text-sm text-white/80">Properties</div>
                  </div>
                </div>}
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-4 animate-fade-in" style={{
            animationDelay: '0.5s'
          }}>
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-5 md:p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105">
                <Shield className="h-10 w-10 md:h-12 md:w-12 text-accent mb-3 md:mb-4 mx-auto" />
                <h3 className="text-base md:text-lg font-semibold text-white mb-2 text-center">Secure & Trusted</h3>
                <p className="text-white/80 text-xs md:text-sm text-center">
                  Your investments are safe with our regulated cooperative structure
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-5 md:p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105">
                <TrendingUp className="h-10 w-10 md:h-12 md:w-12 text-accent mb-3 md:mb-4 mx-auto" />
                <h3 className="text-base md:text-lg font-semibold text-white mb-2 text-center">Regular Dividends</h3>
                <p className="text-white/80 text-xs md:text-sm text-center">
                  Earn competitive returns on your capital contributions
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-5 md:p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105">
                <Users className="h-10 w-10 md:h-12 md:w-12 text-accent mb-3 md:mb-4 mx-auto" />
                <h3 className="text-base md:text-lg font-semibold text-white mb-2 text-center">Community First</h3>
                <p className="text-white/80 text-xs md:text-sm text-center">
                  Built by members, for members, with shared prosperity
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
                Simple steps to start building your wealth with WealthBuilders
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[{
              step: "1",
              title: "Register & Join",
              description: "Sign up with your details and receive your unique member PIN via WhatsApp. Use an invite code to help your referrer earn commission.",
              color: "primary"
            }, {
              step: "2",
              title: "Monthly Contributions",
              description: "Contribute ₦5,500 each month. ₦5,000 builds your capital and savings, while ₦500 supports cooperative operations.",
              color: "secondary"
            }, {
              step: "3",
              title: "Earn Dividends",
              description: "After 3 months and ₦50,000 capital, you're eligible for dividends when properties are sold at profit.",
              color: "accent"
            }].map((item, index) => <div key={index} className="bg-card rounded-xl md:rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-${item.color}/10 flex items-center justify-center mb-4 md:mb-6`}>
                    <span className={`text-xl md:text-2xl font-bold text-${item.color}`}>{item.step}</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-sm md:text-base">{item.description}</p>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Why Join WealthBuilders?</h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
                Exclusive benefits for all our members
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {["Access to property investment opportunities", "Regular dividend payments from property sales", "Build capital and savings simultaneously", "Invite rewards for bringing new members", "Transparent financial tracking dashboard", "Withdrawal access after 6 months", "Community support and networking", "Professional financial management"].map((benefit, index) => <div key={index} className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-background rounded-xl border border-border hover:border-primary/50 transition-all">
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-sm md:text-base">{benefit}</span>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-primary via-primary-dark to-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
              Ready to Start Building Your Future?
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-8 md:mb-10 px-4">
              {loading ? "Join our growing community of wealth builders" : stats.memberCount > 0 ? `Join ${stats.memberCount}+ Nigerians who are already growing their wealth with WealthBuilders` : "Be among the first to start building wealth with WealthBuilders"}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent-light text-foreground font-semibold px-6 md:px-8 py-5 md:py-6 text-base md:text-lg shadow-lg">
                  Become a Member Today
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary font-semibold px-6 md:px-8 py-5 md:py-6 text-base md:text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>;
};
export default Hero;