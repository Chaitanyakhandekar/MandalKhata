import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi } from "../../api/user.api.js";
import { User, Lock, Mail, Tag, FolderKanban } from "lucide-react";
import toast from "react-hot-toast";

const Register = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { name, username, email, password, confirmPassword } = formData;

        if (!name.trim() || !email.trim() || !password) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        const response = await userApi.register({
            name,
            username: username.trim(),
            email: email.trim(),
            password
        });
        setLoading(false);

        if (response.success) {
            toast.success("Mandal registered successfully! Please log in.");
            navigate("/login");
        } else {
            toast.error(response.message || "Registration failed");
        }
    };

    return (
        <div className="flex min-h-screen w-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                {/* Brand / Logo */}
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/35">
                        <FolderKanban className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900">
                        Create Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Register your Ganesh Mandal to get started
                    </p>
                </div>

                {/* Registration Form */}
                <div className="rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">
                                Mandal Admin Name *
                            </label>
                            <div className="relative mt-1.5 rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Chaitanya Khandekar"
                                    className="block w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm placeholder-gray-400 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">
                                Username (Optional)
                            </label>
                            <div className="relative mt-1.5 rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Tag className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="chaitanya95"
                                    className="block w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm placeholder-gray-400 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">
                                Email Address *
                            </label>
                            <div className="relative mt-1.5 rounded-xl shadow-sm">
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
                                Password *
                            </label>
                            <div className="relative mt-1.5 rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="block w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm placeholder-gray-400 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">
                                Confirm Password *
                            </label>
                            <div className="relative mt-1.5 rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="block w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm placeholder-gray-400 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
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
                                    "Create Account"
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{" "}
                            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
