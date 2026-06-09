import logo from "@/assets/logo.png";

type AuthLoadingScreenProps = {
  message?: string;
};

const AuthLoadingScreen = ({ message = "Loading Init Option..." }: AuthLoadingScreenProps) => (
  <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-[#0f1419]">
    <div className="flex flex-col items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-2xl">
        <img src={logo} alt="Init Option" className="h-9 max-w-12 object-contain" />
      </div>
      <div className="mt-5 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-sm font-semibold text-[#536471]">{message}</p>
    </div>
  </div>
);

export default AuthLoadingScreen;
