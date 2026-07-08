import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/axios";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|edu|co)$/;

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    api
      .get("/auth/me")
      .then((response) => {
        if (!mounted) return;

        if (response.data?.user?.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
          return;
        }

        setCheckingSession(false);
      })
      .catch(() => {
        if (mounted) setCheckingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const validateForm = () => {
    if (!emailRegex.test(email.trim())) {
      return "Enter a valid admin email address.";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return "";
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await api.post("/admin/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const from = (location.state as { from?: { pathname?: string } } | null)
        ?.from?.pathname;

      navigate(from && from !== "/admin/login" ? from : "/admin/dashboard", {
        replace: true,
      });
    } catch (error: any) {
      setError(error.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-600">
        Checking admin session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
          Admin Panel
        </p>
        <h1 className="mt-3 text-3xl font-bold text-stone-950">
          Admin login
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Sign in with your admin credentials to continue.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-sm font-medium text-stone-800"
            >
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="mt-2 w-full rounded-md border border-stone-300 px-4 py-3 text-stone-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-stone-800"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
              className="mt-2 w-full rounded-md border border-stone-300 px-4 py-3 text-stone-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-stone-950 px-4 py-3 font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
