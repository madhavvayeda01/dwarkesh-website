import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)] px-6 py-12">
      <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl items-center">
        <div className="w-full rounded-[34px] border border-slate-200/70 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Password Support
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Forgot password?
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Password reset is not self-service yet. To regain access, email
            {" "}
            <span className="font-semibold text-blue-950">
              dwarkeshconsultancyahmedabad@gmail.com
            </span>
            {" "}
            with your company name, registered email, and contact number.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:dwarkeshconsultancyahmedabad@gmail.com"
              className="rounded-2xl bg-[#f7c63d] px-5 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457]"
            >
              Email Support
            </a>
            <Link
              href="/signin"
              className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
            >
              Back to Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
