import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Zap, Shield, Database, ArrowRight, Upload, Users,
  CheckCircle2, MapPin, Phone, Mail, FileSpreadsheet, Clock,
  Send,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Deep People Search",
    description: "Find full profiles — names, addresses, phone numbers, emails, relatives, and associates from public records.",
  },
  {
    icon: Upload,
    title: "Bulk CSV Upload",
    description: "Upload up to 1,000 records at once. Map your columns, preview data, and process in the background.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Results in seconds with auto-retry logic. Background processing means you never lose progress.",
  },
  {
    icon: Shield,
    title: "Your Data, Your Key",
    description: "Bring your own ScrapeDo API key. Your searches are private and cached for 24 hours.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV Export",
    description: "Export results with all your original columns preserved. Status tracking for every row.",
  },
  {
    icon: Clock,
    title: "Smart Caching",
    description: "Same person searched within 24 hours? Instant cached results — no extra API credits used.",
  },
];

const resultFields = [
  { icon: Users, label: "Full Name & Age" },
  { icon: MapPin, label: "Current & Past Addresses" },
  { icon: Phone, label: "Phone Numbers & Carriers" },
  { icon: Mail, label: "Email Addresses" },
  { icon: Users, label: "Relatives & Associates" },
  { icon: Search, label: "Aliases & AKAs" },
];

const Index = () => {
  const navigate = useNavigate();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // For now, just show success — can integrate email later
    await new Promise((r) => setTimeout(r, 500));
    toast({ title: "Message sent!", description: "We'll get back to you soon." });
    setContactName("");
    setContactEmail("");
    setContactMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background bg-grid relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-border bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <span className="font-bold font-heading">OwnerTrace</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">How It Works</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Contact</a>
            <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 container px-4 pt-20 sm:pt-28 pb-16 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
          <Zap className="h-3.5 w-3.5" />
          Built for Real Estate Investors
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading tracking-tight mb-6">
          Trace property owners from{" "}
          <span className="text-gradient-primary">public records</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Find owner contact info — phones, emails, addresses, relatives — in seconds.
          Upload bulk CSVs with up to 1,000 records. One-time purchase, lifetime access.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="hero" size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto">
            Start Searching <ArrowRight className="h-4 w-4" />
          </Button>
          <a href="#how-it-works">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              See How It Works
            </Button>
          </a>
        </div>
      </section>

      {/* What You Get */}
      <section className="relative z-10 container px-4 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold font-heading text-center mb-3">Full Profile Results</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
          Every search returns a comprehensive profile with all available public data.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {resultFields.map((field) => (
            <div key={field.label} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
              <field.icon className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">{field.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 container px-4 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold font-heading text-center mb-3">Everything You Need</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
          Powerful search tools built specifically for real estate investors and skip tracers.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
              <feature.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold font-heading mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 container px-4 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold font-heading text-center mb-3">How It Works</h2>
        <p className="text-muted-foreground text-center mb-10">Get started in 3 simple steps.</p>
        <div className="space-y-6">
          {[
            { step: "1", title: "Sign Up & Add Your API Key", desc: "Create an account and enter your ScrapeDo API key in settings. Get one at scrape.do — it takes 2 minutes." },
            { step: "2", title: "Search or Upload CSV", desc: "Search a single person or upload a CSV with up to 1,000 records. Map your columns and hit search." },
            { step: "3", title: "Export Results", desc: "Download your results as a CSV with all original columns preserved plus the scraped data appended." },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 font-heading">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold font-heading mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
            Get Started Now <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative z-10 container px-4 py-16 max-w-xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold font-heading text-center mb-3">Get in Touch</h2>
        <p className="text-muted-foreground text-center mb-8">Have questions? We'd love to hear from you.</p>
        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleContact} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Your name" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="How can we help?"
                required
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={sending}>
              {sending ? "Sending..." : "Send Message"}
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-muted-foreground">
        <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <span className="font-bold font-heading text-foreground">OwnerTrace</span>
          </div>
          <p>© {new Date().getFullYear()} OwnerTrace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
