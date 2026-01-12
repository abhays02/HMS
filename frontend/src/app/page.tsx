"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/login`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Invalid credentials");
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard"); 
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setForgotMsg("");
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/send-otp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: forgotEmail })
          });
          const d = await res.json();
          if(res.ok) {
              setForgotStep(2);
              setForgotMsg("OTP Sent. Check your email.");
          } else {
              setForgotMsg(d.detail || "Failed to send OTP");
          }
      } catch(e) { console.error(e); setForgotMsg("Error sending OTP"); }
  };

  const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setForgotMsg("");
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/reset-password-otp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: forgotEmail, otp, new_password: newPass })
          });
          
          if(res.ok) {
              // alert("Password Reset Successfully. Please Login.");
              // Converting alert to inline message for better UX
              setForgotMsg("Password Reset Successfully. Please Login.");
              setTimeout(() => {
                  setShowForgot(false);
                  setForgotStep(1);
                  setForgotEmail("");
                  setOtp("");
                  setNewPass("");
                  setForgotMsg("");
              }, 2000);
          } else {
              const d = await res.json();
              setForgotMsg(d.detail || "Reset Failed");
          }
      } catch(e) { console.error(e); setForgotMsg("Error resetting password"); }
  };

  if(showForgot) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="p-8 bg-white rounded shadow-md w-96">
            <h1 className="mb-4 text-xl font-bold text-center text-black">Reset Password</h1>
            {forgotMsg && <p className={`mb-4 text-sm text-center ${forgotMsg.includes("Success") ? "text-green-600" : "text-blue-600"}`}>{forgotMsg}</p>}
            
            {forgotStep === 1 ? (
                <form onSubmit={handleSendOtp}>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-bold text-gray-700">Enter your email</label>
                        <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-black bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 mb-2 transition-colors">Send OTP</button>
                    <button type="button" onClick={() => setShowForgot(false)} className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
                </form>
            ) : (
                <form onSubmit={handleReset}>
                     <div className="mb-4">
                        <label className="block mb-2 text-sm font-bold text-gray-700">OTP Code</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-black bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Enter OTP"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-bold text-gray-700">New Password</label>
                        <input
                            type="password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-black bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            required
                            minLength={8}
                        />
                    </div>
                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-green-600 rounded hover:bg-green-700 mb-2 transition-colors">Reset Password</button>
                    <button type="button" onClick={() => setForgotStep(1)} className="w-full px-4 py-2 text-sm text-blue-600 hover:underline">Back</button>
                </form>
            )}
          </div>
        </div>
      );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-96">
        <h1 className="mb-6 text-2xl font-bold text-center text-black">Login</h1>
        {error && <p className="mb-4 text-red-500 text-sm italic">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded shadow appearance-none focus:outline-none focus:shadow-outline text-black"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-bold text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded shadow appearance-none focus:outline-none focus:shadow-outline text-black"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none focus:shadow-outline"
          >
            Sign In
          </button>
          <div className="mt-4 text-center">
              <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-blue-600 hover:underline">
                  Forgot Password?
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
