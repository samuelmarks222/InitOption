import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    description: "support@initoption.com",
    detail: "We respond within 24 hours",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description: "Available on platform",
    detail: "Instant help while trading",
  },
  {
    icon: Clock,
    title: "Support Hours",
    description: "24/7 Available",
    detail: "Round-the-clock assistance",
  },
  {
    icon: MapPin,
    title: "Office",
    description: "Global Operations",
    detail: "Serving 150+ countries",
  },
];

const ContactUs = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="quotex-glow-home min-h-screen bg-background">
      <Navbar />
      <main className="pb-16 pt-20">
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
              Contact Us
            </span>
            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-5xl">
              Get in <span className="text-gradient-primary">touch</span>
            </h1>
            <p className="mt-4 text-muted-foreground">
              Have questions about Init Option? Our support team is here to help you 24/7.
            </p>
          </motion.div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contactMethods.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-border/50 bg-card p-5 text-center"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <m.icon size={20} />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground">{m.title}</h3>
                <p className="mt-1 text-sm font-medium text-primary">{m.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.detail}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mt-12 max-w-2xl"
          >
            <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-10">
              <h2 className="mb-6 font-heading text-xl font-bold text-foreground">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="border-border bg-background"
                  />
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-border bg-background"
                  />
                </div>
                <Input
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="border-border bg-background"
                />
                <Textarea
                  placeholder="Your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="resize-none border-border bg-background"
                />
                <Button type="submit" size="lg" className="w-full font-semibold">
                  Send Message
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactUs;
