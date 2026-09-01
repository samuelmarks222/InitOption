type AuthLoadingScreenProps = {
  // message prop removed - loading screen shows no text
};

const AuthLoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-white px-6">
    <div className="flex flex-col items-center">
      <div className="mt-5 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  </div>
);

export default AuthLoadingScreen;
