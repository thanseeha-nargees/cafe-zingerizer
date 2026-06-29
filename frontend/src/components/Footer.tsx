
const Footer = () => {
  // ---- logic ----
  const year = new Date().getFullYear();

  // ---- markup ----
  return (
    <footer className="bg-stone-950 text-stone-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-orange-500 font-bold text-lg">
              <span role="img" aria-label="fork and knife">
                🍴
              </span>
              <span>Zingerizer</span>
            </div>
            <p className="mt-3 text-sm text-stone-400 max-w-xs">
              The ultimate cafe management suite for flavor enthusiasts and
              high-performance teams.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Quick Links
            </h3>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              <li>
                <a href="/" className="hover:text-orange-500">
                  Home
                </a>
              </li>
              <li>
                <a href="/menu" className="hover:text-orange-500">
                  Menu
                </a>
              </li>
              <li>
                <a href="/history" className="hover:text-orange-500">
                  History
                </a>
              </li>
              <li>
                <a href="/cart" className="hover:text-orange-500">
                  Cart
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Support
            </h3>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              <li>
                <a href="/contact" className="hover:text-orange-500">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/faq" className="hover:text-orange-500">
                  FAQs
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-orange-500">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-orange-500">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact / Social */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Get in Touch
            </h3>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-stone-400">
              <li>📍 manjeri,kerala,india</li>
              <li>📞 +91 8943430476</li>
              <li>✉️ hello@zingerizer.com</li>
            </ul>
            <div className="mt-4 flex gap-4 text-lg">
              <a href="#" aria-label="Instagram" className="hover:text-orange-500">
                📷
              </a>
              <a href="#" aria-label="Facebook" className="hover:text-orange-500">
                📘
              </a>
              <a href="#" aria-label="Twitter" className="hover:text-orange-500">
                🐦
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© {year} Zingerizer. All rights reserved.</p>
          <p>Made with 🧡 for flavor enthusiasts.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;