import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, LogIn, Utensils } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { hydrateAuth, setCurrentUser } from "../../features/auth/authSlice";
import { getApiMessage } from "../orderUtils";

const emailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|edu|co)$/;

function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { currentUser, status } = useAppSelector((state) => state.auth);
  const checkingSession = status === "idle" || status === "checking";

  useEffect(() => {
    if (status === "idle") {
      void dispatch(hydrateAuth());
    }

    if (status === "authenticated" && currentUser?.role === "staff") {
      navigate("/staff/dashboard", { replace: true });
    }
  }, [currentUser?.role, dispatch, navigate, status]);

  const validateForm = () => {
    if (!emailRegex.test(email.trim())) {
      return "Enter a valid staff email address.";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return "";
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/staff/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      dispatch(setCurrentUser(response.data.user));

      const from = (location.state as { from?: { pathname?: string } } | null)
        ?.from?.pathname;

      navigate(from && from !== "/staff/login" ? from : "/staff/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(getApiMessage(requestError, "Staff login failed"));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">
        Checking staff session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-lg bg-teal-700 text-white">
          <Utensils size={27} strokeWidth={2.4} />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-teal-700">
          Staff Portal
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Staff login
        </h1>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="staff-email"
              className="block text-sm font-bold text-slate-800"
            >
              Email address
            </label>
            <input
              id="staff-email"
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div>
            <label
              htmlFor="staff-password"
              className="block text-sm font-bold text-slate-800"
            >
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
              className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <LogIn size={17} />
            )}
            {loading ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default StaffLogin;
