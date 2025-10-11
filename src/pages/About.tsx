import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Shield, 
  Globe,
  Briefcase,
  CheckCircle2,
  Target,
  Eye,
  Award,
  Landmark
} from "lucide-react";

const About = () => {
  const benefits = [
    "Receive dividends from multiple property sales throughout the year",
    "Dividends shared according to your 80% capital contribution share",
    "Withdraw dividends (profits) at any time, not contributed capital",
    "Collaborate with cooperative developers for building projects",
    "Cooperative raises funds to purchase properties, enhancing dividend sharing",
    "Suitable for students, workers, and public servants to build future wealth",
    "Members can acquire properties worldwide through the cooperative",
    "Genuine, profitable, and transparent property investments"
  ];

  const howToJoin = [
    {
      step: "1",
      title: "Purchase Membership Form",
      description: "Buy a membership form for ₦5,000, fill it out, and sign the terms and conditions"
    },
    {
      step: "2",
      title: "Monthly Contribution",
      description: "Pay ₦5,200 monthly (₦5,000 capital + ₦200 project fund) by the last Thursday of every month"
    },
    {
      step: "3",
      title: "Start Building Wealth",
      description: "Your money starts working after 6 months with minimum ₦50,000 contributed capital"
    },
    {
      step: "4",
      title: "Receive Dividends",
      description: "Earn dividends after every property sale based on your capital share"
    }
  ];

  const governance = [
    {
      icon: Landmark,
      title: "Law Firm",
      description: "Investigates property genuineness and certifies properties for purchase"
    },
    {
      icon: Award,
      title: "Auditing Firm",
      description: "Audits financial transactions and declares profits"
    },
    {
      icon: Briefcase,
      title: "Accounting Firm",
      description: "Handles dividend sharing calculations and distributions"
    },
    {
      icon: Globe,
      title: "Consortium",
      description: "Provides online platform for members to track assets, contributions and dividends"
    },
    {
      icon: Building2,
      title: "Real Estate Consulting",
      description: "Handles property buying, advertising, and selling worldwide"
    },
    {
      icon: Shield,
      title: "Surveying Firm",
      description: "Conducts surveys and prepares necessary documents"
    }
  ];

  const services = [
    {
      icon: Users,
      title: "Crowdfunding for Properties",
      description: "Pool membership contributions to buy and sell properties, sharing dividends after sales"
    },
    {
      icon: Building2,
      title: "Fractional Ownership",
      description: "Own fractions of buildings worldwide and receive monthly rentage plus dividends"
    },
    {
      icon: Globe,
      title: "Diaspora Development",
      description: "Help cooperative members in diaspora develop buildings in Nigeria"
    },
    {
      icon: TrendingUp,
      title: "Global Property Access",
      description: "Acquire lands or properties anywhere in the world through the cooperative"
    }
  ];
  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary-dark to-secondary text-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Wealth Builders in Properties Multipurpose Cooperative Society
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              Build wealth through real estate investment with regular contributions. 
              Real estate is a safe and reliable way to build wealth, as it consistently appreciates in value.
            </p>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <Card className="border-l-4 border-l-primary shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Eye className="h-7 w-7 text-primary" />
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Create a thriving community of WBP Cooperative members who benefit from 
                  real estate wealth creation without stress.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Target className="h-7 w-7 text-secondary" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Provide unique opportunities for members through real estate business, 
                  acquiring lands and building structures, earning dividends and properties 
                  through professional management and strategic investments.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Benefits of Membership</h2>
              <p className="text-muted-foreground text-lg">
                Join us and enjoy exclusive benefits designed for your wealth creation
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-md">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-sm md:text-base">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How to Join */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How to Become a Member</h2>
              <p className="text-muted-foreground text-lg">
                Simple steps to start your wealth-building journey
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {howToJoin.map((item, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <CardHeader>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-primary">{item.step}</span>
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-8 bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <p className="font-semibold text-lg">Important Information:</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Your contribution is split: <strong className="text-foreground">80% Capital</strong> (for property purchases) + <strong className="text-foreground">20% Savings</strong> (for emergency needs)</p>
                    <p>• Access your 20% savings anytime for emergencies</p>
                    <p>• Your 80% capital works with other members&apos; capital for real estate business</p>
                    <p>• Money starts working after 6 months with minimum ₦50,000 capital</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
              <p className="text-muted-foreground text-lg">
                Comprehensive real estate solutions for our members
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {services.map((service, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 rounded-full bg-primary/10">
                        <service.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Governance */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Governance & Operations</h2>
              <p className="text-muted-foreground text-lg">
                Guided by a Board of Trustees ensuring transparency and accountability
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {governance.map((item, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-all text-center">
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-secondary/10">
                        <item.icon className="h-8 w-8 text-secondary" />
                      </div>
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl">Board of Directors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">
                  The cooperative Board of Directors is responsible for:
                </p>
                <ul className="space-y-2 ml-6 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Making strategic decisions for the cooperative</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Seeking funds from banks and international firms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Ensuring transparency and accountability in all operations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Principles */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-xl border-l-4 border-l-accent">
              <CardHeader>
                <CardTitle className="text-2xl md:text-3xl text-center">Key Principles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-8 w-8 text-accent" />
                    </div>
                    <p className="font-semibold mb-2">No Personal Loans</p>
                    <p className="text-sm text-muted-foreground">Focus on wealth creation, not debt</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 text-accent" />
                    </div>
                    <p className="font-semibold mb-2">Audited Transactions</p>
                    <p className="text-sm text-muted-foreground">All financial activities are audited</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Building2 className="h-8 w-8 text-accent" />
                    </div>
                    <p className="font-semibold mb-2">Property Focus</p>
                    <p className="text-sm text-muted-foreground">Funds used only for property acquisition</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Opportunities */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-primary via-primary-dark to-secondary text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Investment Opportunities</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <TrendingUp className="h-10 w-10 text-accent mb-4" />
                <h3 className="text-xl font-semibold mb-3">Save While You Earn</h3>
                <p className="text-white/90">
                  Save funds while earning dividends from multiple property sales throughout the year
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <Building2 className="h-10 w-10 text-accent mb-4" />
                <h3 className="text-xl font-semibold mb-3">Low Entry Investment</h3>
                <p className="text-white/90">
                  Invest in real estate with as low as ₦50,000 and professional management
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
