import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Bitcoin, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { requestDepositReview } from "@/lib/deposits";

type PromoStatus = {
  message: string;
  multiplier: number;
  fixed: number;
  valid: boolean;
  promoId?: string | null;
};

type CryptoPaymentMethod = Tables<"crypto_payment_methods">;

const Deposit = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"card" | "crypto" | "wallet">("card");
  
  // Real DB Crypto Methods
  const [cryptoMethods, setCryptoMethods] = useState<CryptoPaymentMethod[]>([]);
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

  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<PromoStatus | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode) return;
    setValidatingPromo(true);
    setPromoStatus(null);
    try {
      const { data, error } = await supabase.from('promo_codes').select('*').eq('code', promoCode.toUpperCase()).eq('status', 'active').maybeSingle();
      const expiryTime = data ? new Date(data.expiry_date).getTime() : Number.NaN;
      const usageLimitReached = data ? data.max_usages > 0 && data.usages >= data.max_usages : false;

      if (
        error ||
        !data ||
        (!Number.isNaN(expiryTime) && expiryTime <= Date.now()) ||
        usageLimitReached
      ) {
        setPromoStatus({ message: "Invalid or expired code", multiplier: 1, fixed: 0, valid: false });
      } else {
        let multi = 1;
        let fix = 0;
        if (data.type === "Percentage") multi = 1 + (Number(data.reward_value.replace(/[^0-9.]/g, '')) / 100);
        else fix = Number(data.reward_value.replace(/[^0-9.]/g, ''));
        
        setPromoStatus({
          message: `Code applied: ${data.reward_value} Bonus!`,
          multiplier: multi,
          fixed: fix,
          valid: true,
          promoId: data.id,
        });
      }
    } catch (err) {
      console.error(err);
    }
    setValidatingPromo(false);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !amount || Number(amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const selectedCryptoMethod = cryptoMethods.find((entry) => entry.id === selectedCryptoId) ?? null;

    if (method === "crypto" && (!selectedCryptoMethod || !selectedCryptoMethod.wallet_address)) {
      toast({
        title: "Crypto deposit method unavailable",
        description: "Ask an admin to enable a live wallet address before submitting this deposit request.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const baseAmount = Number(amount);

      const depositPayload = await requestDepositReview({
        amount: baseAmount,
        method,
        paymentMethodId: method === "crypto" ? selectedCryptoId || null : null,
        promoId: promoStatus?.valid ? promoStatus.promoId ?? null : null,
      });

      await refreshProfile();

      const appliedPromoBonus = Number(depositPayload.promo_bonus ?? 0);
      toast({
        title: "Deposit submitted",
        description:
          appliedPromoBonus > 0
            ? `Your ${method} deposit is now pending admin review. Automatic blockchain detection is not wired yet, so no balance was added. Promo bonus ${appliedPromoBonus.toFixed(2)} will only be applied after approval.`
            : "Your deposit is now pending admin review. Automatic blockchain detection is not wired yet, so no balance was added yet.",
      });
      navigate("/trade");
    } catch (error) {
      toast({
        title: "Deposit Failed",
        description: error instanceof Error ? error.message : "Something went wrong while submitting the deposit request.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-xl space-y-6 mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SiteLogo to="/" subtitle="Secure funding" />
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
        </div>

        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Deposit Funds</CardTitle>
            <CardDescription>Submit a deposit request that stays pending until a finance admin approves it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit} className="space-y-8">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                Automatic blockchain detection is not wired yet. After you submit a deposit, it stays pending and does not credit instantly. Final approval is manual/admin until a blockchain webhook or listener is added.
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod("card")}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      method === "card" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <CreditCard className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">Card</span>
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
                    onClick={() => setMethod("wallet")}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      method === "wallet" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <Wallet className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">E-Wallet</span>
                  </button>
                </div>
              </div>

              {method === "crypto" && cryptoMethods.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="text-sm font-medium text-foreground">Select Cryptocurrency</label>
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

                  {cryptoMethods.find(c => c.id === selectedCryptoId) && (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-4 space-y-3">
                       <p className="text-xs text-blue-400 font-bold">Transfer Exact Amount to the following Deposit Address</p>
                       {cryptoMethods.find(c => c.id === selectedCryptoId).qr_code_url && (
                          <div className="flex justify-center mb-2">
                             <img src={cryptoMethods.find(c => c.id === selectedCryptoId).qr_code_url} alt="QR" className="w-32 h-32 rounded bg-white p-1" />
                          </div>
                       )}
                       <div className="bg-[#0b0e14] border border-blue-500/30 p-3 rounded text-center">
                          <code className="text-xs text-blue-300 break-all select-all font-mono">
                             {cryptoMethods.find(c => c.id === selectedCryptoId).wallet_address || "Wallet Address Pending Admin Configuration"}
                          </code>
                       </div>
                       <p className="text-[10px] text-gray-400 text-center">Please ensure you select the <strong>{cryptoMethods.find(c => c.id === selectedCryptoId).network}</strong> network when sending your funds. Sending on the wrong network will result in permanent loss of funds.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Enter amount (Min $10)"
                    className="w-full bg-secondary border border-border rounded-lg py-3 pl-8 pr-4 text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  {[50, 100, 250, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className="flex-1 py-1.5 rounded-md bg-secondary border border-border text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">Promo Code (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code..."
                    className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary transition-colors uppercase"
                  />
                  <Button type="button" variant="outline" onClick={handleApplyPromo} disabled={!promoCode || validatingPromo}>
                    {validatingPromo ? "..." : "Apply"}
                  </Button>
                </div>
                {promoStatus && (
                  <p className={`text-xs font-bold ${promoStatus.valid ? "text-green-500" : "text-red-500"}`}>
                    {promoStatus.message}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-6 text-sm">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-semibold text-foreground">${profile?.balance?.toFixed(2) || "0.00"}</span>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !amount} 
                  className="w-full py-6 text-lg gradient-primary"
                >
                  {loading ? "Processing..." : `Deposit $${amount || "0"}`}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Deposit requests stay pending until a finance admin approves them. No instant credit is applied.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Deposit;
