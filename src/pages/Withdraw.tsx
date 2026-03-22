import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Banknote, Bitcoin, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { requestWithdrawal } from "@/lib/withdrawals";

const Withdraw = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"bank" | "crypto" | "cash">("bank");
  const [address, setAddress] = useState("");

  // Real DB Crypto Methods
  const [cryptoMethods, setCryptoMethods] = useState<Tables<"crypto_payment_methods">[]>([]);
  const [selectedCryptoId, setSelectedCryptoId] = useState<string>("");

  useEffect(() => {
    async function fetchCrypto() {
      const { data, error } = await supabase.from('crypto_payment_methods').select('*').eq('status', 'active').order('coin_name');
      if (data && !error) {
         setCryptoMethods(data);
         if (data.length > 0) setSelectedCryptoId(data[0].id);
      }
    }
    fetchCrypto();
  }, []);

  const selectedCrypto = cryptoMethods.find((crypto) => crypto.id === selectedCryptoId) ?? null;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !amount || Number(amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (Number(amount) < 10) {
      toast({ title: "Minimum withdrawal is $10", variant: "destructive" });
      return;
    }

    if (!address) {
      toast({ title: "Please enter withdrawal destination", variant: "destructive" });
      return;
    }

    if (method === "crypto" && !selectedCrypto) {
      toast({ title: "Choose a crypto payout method", variant: "destructive" });
      return;
    }

    if (Number(amount) > profile.balance) {
      toast({ title: "Insufficient funds", description: `Your balance is $${profile.balance.toFixed(2)}`, variant: "destructive" });
      return;
    }

    setLoading(true);

    const withdrawalMethod =
      method === "crypto"
        ? `${selectedCrypto?.symbol.toUpperCase()} (${selectedCrypto?.network.toUpperCase()}) Wallet`
        : method === "cash"
          ? "Cash / E-Wallet"
          : "Bank Transfer";

    try {
      await requestWithdrawal({
        amount: Number(amount),
        destination: address.trim(),
        method: withdrawalMethod,
      });

      await refreshProfile();
      toast({
        title: "Withdrawal submitted",
        description: `$${Number(amount).toFixed(2)} is now pending admin review.`,
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-xl space-y-6 mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SiteLogo to="/" subtitle="Payout access" />
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
        </div>

        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Withdraw Funds</CardTitle>
            <CardDescription>Request a payout to your preferred destination.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdraw} className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">Withdrawal Method</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod("bank")}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      method === "bank" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <Building2 className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("crypto")}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      method === "crypto" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <Bitcoin className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">Crypto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("cash")}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      method === "cash" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <Banknote className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">Cash/E-Wallet</span>
                  </button>
                </div>
              </div>

              {method === "crypto" && cryptoMethods.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="text-sm font-medium text-foreground">Select Withdrawal Cryptocurrency</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {cryptoMethods.map(crypto => (
                      <button
                        key={crypto.id}
                        type="button"
                        onClick={() => setSelectedCryptoId(crypto.id)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                          selectedCryptoId === crypto.id ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/50"
                        }`}
                      >
                         <img src={`https://assets.coincap.io/assets/icons/${crypto.symbol.toLowerCase().replace('usdt', 'tether')}@2x.png`} className="w-5 h-5 rounded-full bg-white p-[1px]" onError={(e) => { e.currentTarget.style.display = 'none'}} alt="" />
                         <div className="flex flex-col overflow-hidden">
                           <span className="text-sm font-bold text-white truncate">{crypto.symbol}</span>
                           <span className="text-[10px] text-gray-400 truncate">{crypto.network}</span>
                         </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">
                  {method === "bank" ? "Bank Account Number (IBAN)" : method === "crypto" ? "Your Destination Wallet Address" : "E-Wallet ID"}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={method === "bank" ? "Enter your bank account info" : "Enter destination address"}
                  className="w-full bg-secondary border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground flex justify-between">
                  <span>Amount (USD)</span>
                  <span className="text-muted-foreground">Available: ${profile?.balance?.toFixed(2) || "0.00"}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    max={profile?.balance || 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Enter amount (Min $10)"
                    className="w-full bg-secondary border border-border rounded-lg py-3 pl-8 pr-4 text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(Number(profile?.balance?.toFixed(2) || 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium bg-secondary border border-border px-2 py-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button 
                  type="submit" 
                  disabled={loading || !amount || !address} 
                  className="w-full py-6 text-lg gradient-primary"
                >
                  {loading ? "Processing..." : `Request $${amount || "0"} Withdrawal`}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Withdrawals are typically processed within 24-48 hours. Please ensure your destination details are correct.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Withdraw;
