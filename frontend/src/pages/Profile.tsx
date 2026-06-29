import { useEffect, useState } from "react";
import { api } from "../api/axios";

export default function Profile() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.user);
      } catch (error) {
        console.log(error);
      }
    };

    getUser();
  }, []);

  return (
    <div>
      <h2>Profile</h2>

      {user && (
        <>
          <p>Name: {user.userName}</p>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
        </>
      )}
    </div>
  );
}