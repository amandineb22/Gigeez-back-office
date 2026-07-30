import Image from "next/image";
import { theme } from "@/theme/config";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string }>;
}) {
  const { redirectedFrom } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src={theme.logo.mark}
            alt={theme.logo.text}
            width={theme.logo.width}
            height={theme.logo.height}
            className="h-20 w-20 object-contain"
            priority
          />
        </div>

        <div className="rounded-2xl border border-ink/5 bg-white/70 p-7 shadow-soft backdrop-blur">
          <h1 className="mb-6 font-display text-xl text-ink">Sign in to your dashboard</h1>
          <LoginForm redirectTo={redirectedFrom ?? "/"} />
        </div>

        <p className="mt-6 text-center text-xs text-ink/40">
          Private internal tool — access is limited to invited team members.
        </p>
      </div>
    </div>
  );
}
