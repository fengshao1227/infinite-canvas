"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "antd";
import { UserPlus, User, Lock } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const register = async () => {
        if (!username.trim() || !password) return;
        if (password !== confirmPassword) {
            setError("两次密码不一致");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password }),
            });
            const data = await res.json();
            if (res.ok) {
                router.push("/canvas");
                router.refresh();
            } else {
                setError(data.error || "注册失败");
            }
        } catch {
            setError("网络错误");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 px-4 dark:from-stone-950 dark:to-stone-900">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-stone-900 shadow-lg dark:bg-stone-100">
                        <span className="text-2xl font-bold text-white dark:text-stone-900">AI</span>
                    </div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">AI Studio</h1>
                    <p className="mt-1 text-sm text-stone-500">创建新账号</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">用户名</label>
                            <Input
                                size="large"
                                prefix={<User className="size-4 text-stone-400" />}
                                placeholder="2-20 个字符"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">密码</label>
                            <Input.Password
                                size="large"
                                prefix={<Lock className="size-4 text-stone-400" />}
                                placeholder="至少 6 位"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">确认密码</label>
                            <Input.Password
                                size="large"
                                prefix={<Lock className="size-4 text-stone-400" />}
                                placeholder="再输一次密码"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onPressEnter={() => void register()}
                            />
                        </div>
                        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</div>}
                        <Button type="primary" size="large" block icon={<UserPlus className="size-4" />} loading={loading} onClick={() => void register()}>
                            注册
                        </Button>
                    </div>
                    <div className="mt-4 text-center text-sm text-stone-500">
                        已有账号？{" "}
                        <a href="/login" className="font-medium text-stone-900 hover:underline dark:text-stone-200">
                            登录
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
