import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userAuthStore } from "../../store/userStore.js";
import { userApi } from "../../api/user.api.js";
import { Lock, Mail, Eye, EyeOff, FolderKanban } from "lucide-react";
import toast from "react-hot-toast";

const Login = () => {
    const navigate = useNavigate();
    const { setUser } = userAuthStore();

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { email, password } = formData;
        if (!email.trim() || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        setLoading(true);
        const response = await userApi.login({ email, password });
        setLoading(false);

        if (response.success) {
            setUser(response.data.user);
            toast.success("Welcome to MandalKhata!");
            navigate("/");
        } else {
            toast.error(response.message || "Invalid credentials");
        }
    };

    return (
        <div className="flex min-h-dvh w-full items-center justify-center bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                {/* Brand / Logo */}
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/35">
                        <FolderKanban className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Sign in to manage your Ganesh Mandal finances
                    </p>
                </div>

                {/* Login Form */}
                <div className="rounded-3xl bg-white p-6 shadow-xl shadow-gray-200/50 border border-gray-100 sm:p-8">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">
                                Email Address
                            </label>
                            <div className="relative mt-2 rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@mandal.com"
                                    className="block w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm placeholder-gray-400 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">
                                Password
                            </label>
                            <div className="relative mt-2 rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="block w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-sm placeholder-gray-400 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:bg-indigo-700 hover:shadow-indigo-700/30 focus:outline-none disabled:bg-indigo-400"
                            >
                                {loading ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Don't have an account?{" "}
                            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Register your Mandal
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
