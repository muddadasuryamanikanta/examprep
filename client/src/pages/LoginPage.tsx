import { LoginForm } from '../components/Auth/LoginForm';

export const LoginPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.05),transparent)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)]" />
      <LoginForm />
    </div>
  );
};
