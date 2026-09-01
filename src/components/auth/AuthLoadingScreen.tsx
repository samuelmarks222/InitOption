type AuthLoadingScreenProps = {
  message?: string;
};

const AuthLoadingScreen = ({ message = "Loading Init Option..." }: AuthLoadingScreenProps) => (
  <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-[#0f1419]">
    <div className="flex flex-col items-center">
      <div className="mt-5 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-sm font-semibold text-[#536471]">{message}</p>
    </div>
  </div>
);

export default AuthLoadingScreen;
