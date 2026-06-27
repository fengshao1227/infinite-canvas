"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Keyboard, LogOut, UserCircle } from "lucide-react";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";

type UserStatusActionsProps = {
    showConfig?: boolean;
    variant?: "default" | "canvas";
    onOpenShortcuts?: () => void;
};

export function UserStatusActions({ variant = "default", onOpenShortcuts }: UserStatusActionsProps) {
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const canvasTheme = canvasThemes[theme];
    const naturalIconClass = "inline-flex size-7 shrink-0 items-center justify-center text-stone-600 transition hover:text-stone-950 dark:text-stone-300 dark:hover:text-white [&_svg]:size-4";
    const iconStyle: CSSProperties | undefined = variant === "canvas" ? { color: canvasTheme.node.text } : undefined;
    const [username, setUsername] = useState("");

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((data: { user?: { username: string } | null }) => setUsername(data.user?.username || ""))
            .catch(() => {});
    }, []);

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
    };

    return (
        <div className="inline-flex shrink-0 items-center gap-1">
            {username ? (
                <span className="mr-1 flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300" style={iconStyle}>
                    <UserCircle className="size-3.5" />
                    {username}
                </span>
            ) : null}
            <AnimatedThemeToggler theme={theme} onThemeChange={setTheme} className={naturalIconClass} style={iconStyle} aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"} title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"} />
            {onOpenShortcuts ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={onOpenShortcuts} aria-label="快捷键" title="快捷键">
                    <Keyboard className="size-4" />
                </button>
            ) : null}
            {username ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={() => void logout()} aria-label="退出" title="退出登录">
                    <LogOut className="size-4" />
                </button>
            ) : null}
        </div>
    );
}
