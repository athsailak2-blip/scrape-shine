import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Zap, Shield, Database, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Search public records in seconds with high-performance infrastructure.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your searches are cached and encrypted. Only you can see your results.",
  },
  {
    icon: Database,
    title: "Bulk Search",
    description: "Upload a CSV with hundreds of names and get results for all of them.",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-grid relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <nav className="relative z-10 border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <span className="font-bold font-heading">OwnerTrace</span>
          </div>
          <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <section className="relative z-10 container px-4 pt-24 pb-16 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
          <Zap className="h-3.5 w-3.5" />
          People Search Engine
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading tracking-tight mb-6">
          Trace anyone from{" "}
          <span className="text-gradient-primary">public records</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Find emails, phone numbers, and more. Single or bulk search
          with CSV upload. Built for skip tracers and investigators.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
            Start Searching <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="relative z-10 container px-4 py-16 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
              <feature.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold font-heading mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 OwnerTrace. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
