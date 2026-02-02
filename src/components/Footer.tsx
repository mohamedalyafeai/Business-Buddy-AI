import { useTranslation } from "react-i18next";
import { Sparkles, Twitter, Linkedin, Github, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export const Footer = () => {
  const { t } = useTranslation();

  const footerLinks = {
    product: [
      { label: t("footer.features"), href: "#features" },
      { label: t("footer.pricing"), href: "#pricing" },
      { label: t("footer.integrations"), href: "#" },
      { label: t("footer.changelog"), href: "#" },
    ],
    company: [
      { label: t("footer.about"), href: "#" },
      { label: t("footer.blog"), href: "#" },
      { label: t("footer.careers"), href: "#" },
      { label: t("footer.contact"), href: "#" },
    ],
    resources: [
      { label: t("footer.documentation"), href: "#" },
      { label: t("footer.apiReference"), href: "#" },
      { label: t("footer.helpCenter"), href: "#" },
      { label: t("footer.community"), href: "#" },
    ],
    legal: [
      { label: t("footer.privacyPolicy"), href: "/privacy", isRoute: true },
      { label: t("footer.termsOfService"), href: "/terms", isRoute: true },
      { label: t("footer.cookiePolicy"), href: "#" },
    ],
  };

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container-custom section-padding pb-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">AgentAI</span>
            </a>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-6">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.product")}</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.company")}</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.resources")}</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AgentAI. {t("footer.allRightsReserved")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("footer.madeWith")}
          </p>
        </div>
      </div>
    </footer>
  );
};
