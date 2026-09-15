import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PoolitoHomePage from "@/components/landing/PoolitoHomePage";
import MarketTicker from "@/components/landing/MarketTicker";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  configurable: true,
  writable: true,
  value: IntersectionObserverMock,
});

const renderWithProviders = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("public navigation links", () => {
  it("routes navbar links back to working public pages", () => {
    renderWithProviders(<Navbar />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "About Us" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Trading" })).toHaveAttribute("href", "/trade");
    expect(screen.getByRole("link", { name: "Tournaments" })).toHaveAttribute("href", "/tournaments");
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "/contact");
  });

  it("uses the shared public header on the landing page", () => {
    renderWithProviders(<PoolitoHomePage />);

    expect(screen.getByText(/Monday - Saturday 8:00 AM - 5:00 PM/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About Us" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
  });

  it("keeps footer links on live internal destinations", () => {
    renderWithProviders(<Footer />);

    expect(screen.getByRole("img", { name: "Init Option" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Blog" })[0]).toHaveAttribute("href", "/blog");
    expect(screen.getAllByRole("link", { name: "Contact us" })[0]).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Terms and Conditions" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Read full risk disclaimer" })).toHaveAttribute("href", "/risk-disclaimer");
  });

  it("renders the homepage sections targeted by hash links", () => {
    renderWithProviders(
      <>
        <MarketTicker />
        <FeaturesSection />
        <TestimonialsSection />
        <FAQSection />
      </>,
    );

    expect(document.getElementById("markets")).toBeTruthy();
    expect(document.getElementById("features")).toBeTruthy();
    expect(document.getElementById("reviews")).toBeTruthy();
    expect(document.getElementById("faq")).toBeTruthy();
  });
});
