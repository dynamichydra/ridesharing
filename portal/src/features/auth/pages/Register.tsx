const Register = () => {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold">Register Admin</h2>
        <p className="text-muted-foreground mt-2">Admin accounts cannot be registered publicly. Please contact a super admin.</p>
        <a href="/login" className="text-primary hover:underline mt-4 block">Back to Login</a>
      </div>
    </div>
  );
};

export default Register;
