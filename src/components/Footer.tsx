import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Facebook, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="WealthBuilders Logo" className="h-12 w-12" />
              <span className="font-heading font-bold text-xl">
                WealthBuilders Cooperative
              </span>
            </div>
            <p className="text-white/80 mb-4 max-w-md">
              Building wealth together through cooperative principles. Join thousands of members who trust us with their financial future.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-white/60 hover:text-accent transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-accent transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-accent transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-white/80 hover:text-accent transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-white/80 hover:text-accent transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-white/80 hover:text-accent transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white/80 hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-white/80 hover:text-accent transition-colors">
                  Become a Member
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-accent transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-white/80">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Suit D119 New Orisumbare Complex, MDS Osogbo, Osun State, Nigeria</span>
              </li>
              <li className="flex items-center gap-2 text-white/80">
                <Phone className="h-5 w-5 flex-shrink-0" />
                <a href="tel:+2348103509131" className="text-sm hover:text-accent transition-colors">
                  +234 810 350 9131
                </a>
              </li>
              <li className="flex items-center gap-2 text-white/80">
                <Mail className="h-5 w-5 flex-shrink-0" />
                <a href="mailto:support@wealthbuilderscooperative.com" className="text-sm hover:text-accent transition-colors">
                  support@wealthbuilderscooperative.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm text-white/70">
            <p>© 2025 WealthBuilders Cooperative. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
