import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import logo from "@/assets/logo.png";

const Forgot = () => {
  const { resetPassword, verifyPasswordResetCode, updatePasswordAfterReset, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return <AuthLoadingScreen message="Checking your session..." />;
  if (user) return <Navigate to="/trade" replace />;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (!error) setSent(true);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    const { error } = await verifyPasswordResetCode(email, code);
    setLoading(false);
    if (!error) setVerified(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setLoading(true);
    const { error } = await updatePasswordAfterReset(newPassword);
    setLoading(false);
    if (!error) {
      // redirect to login
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f7fb] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-[#e6ecf3] p-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
          </div>
          <h2 className="text-xl font-bold text-center">Password recovery</h2>
          <p className="mt-2 text-center text-sm text-[#6b7280]">Enter your email and follow the instructions</p>

          {!sent ? (
            <form onSubmit={handleSend} className="mt-6 space-y-4">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your email" />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send Verification Code"} <ArrowRight size={16} /></Button>
            </form>
          ) : !verified ? (
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verifying..." : "Verify Code"} <ArrowRight size={16} /></Button>
            </form>
          ) : (
            <form onSubmit={handleUpdate} className="mt-6 space-y-4">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating..." : "Update Password"} <ArrowRight size={16} /></Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-[#0f72f0] hover:underline">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forgot;
