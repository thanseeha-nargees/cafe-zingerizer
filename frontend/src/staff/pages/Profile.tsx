import { useEffect, useState } from "react";
import { Loader2, Mail, Phone, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../../api/axios";
import { getApiMessage } from "../orderUtils";

type StaffProfileData = {
  _id: string;
  userName: string;
  email: string;
  phoneNumber?: string;
  profileImage?: string;
  role: "staff";
  isActive: boolean;
  createdAt?: string;
};

type StaffProfileResponse = {
  staff: StaffProfileData;
};

const formatDate = (dateValue?: string) => {
  if (!dateValue) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
};

function StaffProfile() {
  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<StaffProfileResponse>("/staff/profile");
      setProfile(response.data.staff);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Failed to load profile"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase text-teal-700">
            Staff Account
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            My Profile
          </h1>
        </div>
        <button
          type="button"
          onClick={loadProfile}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-4 py-16 text-center text-sm font-bold text-slate-500">
            <Loader2 className="mr-2 inline animate-spin text-teal-700" size={18} />
            Loading profile...
          </div>
        ) : profile ? (
          <div className="p-5">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
              <div className="flex size-20 items-center justify-center rounded-lg bg-teal-700 text-2xl font-black text-white">
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.userName}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  profile.userName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-black text-slate-950">
                  {profile.userName}
                </h2>
                <p className="mt-2 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-700 ring-1 ring-teal-200">
                  {profile.role}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Mail className="text-teal-700" size={20} />
                <p className="mt-3 text-xs font-black uppercase text-slate-500">
                  Email
                </p>
                <p className="mt-2 break-all text-sm font-extrabold text-slate-950">
                  {profile.email}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Phone className="text-teal-700" size={20} />
                <p className="mt-3 text-xs font-black uppercase text-slate-500">
                  Phone
                </p>
                <p className="mt-2 text-sm font-extrabold text-slate-950">
                  {profile.phoneNumber || "Not added"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <ShieldCheck className="text-teal-700" size={20} />
                <p className="mt-3 text-xs font-black uppercase text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-sm font-extrabold text-slate-950">
                  {profile.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <UserRound className="text-teal-700" size={20} />
                <p className="mt-3 text-xs font-black uppercase text-slate-500">
                  Joined
                </p>
                <p className="mt-2 text-sm font-extrabold text-slate-950">
                  {formatDate(profile.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-16 text-center text-sm font-bold text-slate-500">
            Profile unavailable.
          </div>
        )}
      </section>
    </div>
  );
}

export default StaffProfile;
