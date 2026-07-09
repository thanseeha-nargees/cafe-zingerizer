import { useEffect, useState } from "react";
import { api } from "../../api/axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { setCurrentUser } from "./authSlice";

function VerifyOtp() {
  const location = useLocation();
  const routeState = (location.state as { email?: string } | null) || {};
  const initialEmail = routeState.email || "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const getApiMessage = (requestError: unknown, fallback: string) => {
    if (
      typeof requestError === "object" &&
      requestError !== null &&
      "response" in requestError &&
      typeof requestError.response === "object" &&
      requestError.response !== null &&
      "data" in requestError.response &&
      typeof requestError.response.data === "object" &&
      requestError.response.data !== null &&
      "message" in requestError.response.data &&
      typeof requestError.response.data.message === "string"
    ) {
      return requestError.response.data.message;
    }

    return fallback;
  };

  useEffect(() => {
    if (resendCooldown === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/auth/verify-otp", { email, otp });
      dispatch(setCurrentUser(response.data.user));
      navigate("/", { replace: true });
    } catch (requestError: unknown) {
      setError(getApiMessage(requestError, "OTP verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setMessage("");
    setResendLoading(true);

    try {
      await api.post("/auth/send-otp", { email });
      setOtp("");
      setMessage("A new OTP has been sent to your email.");
      setResendCooldown(30);
    } catch (requestError: unknown) {
      setError(getApiMessage(requestError, "Unable to resend OTP"));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
          Check your inbox
        </p>
        <h1 className="mt-3 text-3xl font-bold text-stone-950">
          Enter verification code
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Use the 6-digit OTP sent to your email.
        </p>

        <form onSubmit={handleVerify} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-stone-800"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-2 w-full rounded-md border border-stone-300 px-4 py-3 text-stone-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-stone-800"
            >
              OTP
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              className="mt-2 w-full rounded-md border border-stone-300 px-4 py-3 text-center text-2xl font-semibold tracking-[0.35em] text-stone-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-md bg-stone-950 px-4 py-3 font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={!email || resendLoading || resendCooldown > 0}
            className="w-full rounded-md border border-stone-300 px-4 py-3 font-medium text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendLoading
              ? "Sending..."
              : resendCooldown > 0
                ? `Resend OTP in ${resendCooldown}s`
                : "Resend OTP"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default VerifyOtp;
