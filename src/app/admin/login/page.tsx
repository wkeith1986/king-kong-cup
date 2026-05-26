import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="container-narrow pt-16 pb-24 max-w-md">
      <div className="flex justify-center mb-6">
        <Logo size="lg" withWordmark={false} />
      </div>
      <h1 className="h-display text-center text-xl text-brand-cream font-bold">
        Tournament Admin
      </h1>
      <div className="gold-rule my-5" />
      <LoginForm />
    </div>
  );
}
