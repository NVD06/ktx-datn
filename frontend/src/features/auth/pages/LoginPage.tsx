import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useLogin } from "@/features/auth/hooks/useAuth";
import { redirectAfterLogin } from "@/routes/paths";
const loginSchema = z.object({
  email: z.email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
type LoginForm = z.infer<typeof loginSchema>;
export function LoginPage() {
  const { user, isLoading } = useAuth();
  const login = useLogin();
  const location = useLocation();
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  if (!isLoading && user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={redirectAfterLogin(user.role, from)} replace />;
  }
  const err = form.formState.errors;
  return (
    <main className="bg-card min-h-svh">
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-4 py-4 sm:px-6">
        <div className="mt-3 grid flex-1 gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <img
            src="/images/landing-building.jpg"
            alt="Ký túc xá Đại học Phenikaa"
            className="hidden h-full max-h-[calc(100svh-6rem)] w-full rounded-2xl object-cover lg:block"
          />
          <div className="mx-auto flex w-full max-w-md flex-col justify-center py-8">
            <div className="text-center">
              <h1 className="text-3xl font-semibold">Xác minh tài khoản</h1>
              <p className="text-muted-foreground mt-3 text-sm font-bold uppercase">
                Dành cho sinh viên và cán bộ quản lý
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                để sử dụng hệ thống ký túc xá Phe
              </p>
            </div>
            <form
              onSubmit={form.handleSubmit((v) => login.mutate(v))}
              className="mt-6 space-y-3 rounded-2xl border p-6"
              noValidate
            >
              <div>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-label="Email"
                  placeholder="Email"
                  aria-invalid={!!err.email}
                  className="bg-card dark:bg-card h-12 px-4"
                  {...form.register("email")}
                />
                {err.email && (
                  <p className="text-destructive mt-1 text-xs">
                    {err.email.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-label="Mật khẩu"
                  placeholder="Mật khẩu"
                  aria-invalid={!!err.password}
                  className="bg-card dark:bg-card h-12 px-4"
                  {...form.register("password")}
                />
                {err.password && (
                  <p className="text-destructive mt-1 text-xs">
                    {err.password.message}
                  </p>
                )}
              </div>
              {login.isError && (
                <p className="bg-destructive/10 text-destructive rounded-md p-2 text-sm">
                  {getErrorMessage(
                    login.error,
                    "Email hoặc mật khẩu không đúng",
                  )}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="mt-2 h-11 w-full text-base"
                disabled={login.isPending}
              >
                {login.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>
            </form>
            <div className="mt-4 flex items-center justify-between">
              <Button asChild variant="outline" size="sm">
                <Link to="/">
                  <ArrowLeft />
                  Quay lại
                </Link>
              </Button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
                onClick={() =>
                  toast.info(
                    "Liên hệ ban quản lý ký túc xá để được cấp lại mật khẩu.",
                  )
                }
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
