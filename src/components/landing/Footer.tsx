import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">12</span>
              </div>
              <span className="text-xl font-bold text-foreground">iq option</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The best trading platform for beginners and professionals.
            </p>
          </div>

          {/* For Traders */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">For Traders</h4>
            <ul className="space-y-2">
              <li><Link to="/trade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Trade Room</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Binary Options</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Digital Options</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Forex</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Stocks</Link></li>
            </ul>
          </div>

          {/* About Us */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">About Us</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Regulation</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Help Center</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Risk Disclosure</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 IQ Option. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground max-w-2xl text-center md:text-right">
              Trading involves risk. Your capital is at risk. CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
