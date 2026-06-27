"use client";

import { useEffect, useState } from "react";
import { App, Button, Form, Input, Select, Tag } from "antd";
import { Plus, RefreshCw, Trash2, LogOut, Lock } from "lucide-react";

import { fetchChannelModels } from "@/services/api/image";
import { audioFormatOptions, audioVoiceOptions, normalizeAudioSpeedValue } from "@/lib/audio-generation";
import {
    createModelChannel,
    defaultBaseUrlForApiFormat,
    filterModelsByCapability,
    modelOptionLabel,
    modelOptionsFromChannels,
    normalizeModelOptionValue,
    useConfigStore,
    type AiConfig,
    type ApiCallFormat,
    type ModelCapability,
    type ModelChannel,
} from "@/stores/use-config-store";

type ModelGroup = {
    capability: ModelCapability;
    modelKey: "imageModel" | "videoModel" | "textModel" | "audioModel";
    modelsKey: "imageModels" | "videoModels" | "textModels" | "audioModels";
    label: string;
};

const MODEL_GROUPS: ModelGroup[] = [
    { capability: "image", modelKey: "imageModel", modelsKey: "imageModels", label: "生图模型" },
    { capability: "video", modelKey: "videoModel", modelsKey: "videoModels", label: "视频模型" },
    { capability: "text", modelKey: "textModel", modelsKey: "textModels", label: "文本模型" },
    { capability: "audio", modelKey: "audioModel", modelsKey: "audioModels", label: "音频模型" },
];

const API_FORMAT_OPTIONS: Array<{ label: string; value: ApiCallFormat }> = [
    { label: "OpenAI", value: "openai" },
    { label: "Gemini", value: "gemini" },
];

function uniqueModels(models: string[]) {
    return Array.from(new Set(models.map((m) => m.trim()).filter(Boolean)));
}

function withChannels(config: AiConfig, channels: ModelChannel[]): AiConfig {
    const models = modelOptionsFromChannels(channels);
    return {
        ...config,
        channels,
        models,
        baseUrl: channels[0]?.baseUrl || config.baseUrl,
        apiKey: channels[0]?.apiKey || config.apiKey,
        apiFormat: channels[0]?.apiFormat || config.apiFormat,
        imageModels: filterModelsByCapability(models, "image"),
        videoModels: filterModelsByCapability(models, "video"),
        textModels: filterModelsByCapability(models, "text"),
        audioModels: filterModelsByCapability(models, "audio"),
    };
}

export default function AdminPage() {
    const [authed, setAuthed] = useState(false);
    const [checking, setChecking] = useState(true);
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    useEffect(() => {
        fetch("/api/admin/verify")
            .then((r) => r.json())
            .then((data: { ok: boolean }) => setAuthed(data.ok))
            .catch(() => setAuthed(false))
            .finally(() => setChecking(false));
    }, []);

    const login = async () => {
        setLoginError("");
        const res = await fetch("/api/admin/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });
        if (res.ok) {
            setAuthed(true);
        } else {
            setLoginError("密码错误");
        }
    };

    const logout = () => {
        document.cookie = "admin_token=; path=/; max-age=0";
        setAuthed(false);
        setPassword("");
    };

    if (checking) {
        return (
            <div className="flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
                <div className="text-stone-400">验证中...</div>
            </div>
        );
    }

    if (!authed) {
        return (
            <div className="flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
                <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-lg dark:border-stone-800 dark:bg-stone-900">
                    <div className="mb-6 flex flex-col items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
                            <Lock className="size-5 text-stone-500" />
                        </div>
                        <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">管理后台</h1>
                    </div>
                    <div className="space-y-4">
                        <Input.Password
                            size="large"
                            placeholder="输入管理密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onPressEnter={() => void login()}
                            status={loginError ? "error" : undefined}
                        />
                        {loginError && <div className="text-sm text-red-500">{loginError}</div>}
                        <Button type="primary" size="large" block onClick={() => void login()}>
                            进入
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <App>
            <AdminPanel onLogout={logout} />
        </App>
    );
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
    const { message } = App.useApp();
    const config = useConfigStore((s) => s.config);
    const updateConfig = useConfigStore((s) => s.updateConfig);
    const [loadingChannelId, setLoadingChannelId] = useState("");

    const saveConfig = (next: AiConfig) => {
        (Object.keys(next) as Array<keyof AiConfig>).forEach((key) => updateConfig(key, next[key]));
    };

    const updateChannels = (channels: ModelChannel[]) => saveConfig(withChannels(config, channels));

    const updateChannel = (id: string, patch: Partial<ModelChannel>) => {
        updateChannels(config.channels.map((ch) => (ch.id === id ? { ...ch, ...patch, models: patch.models ? uniqueModels(patch.models) : ch.models } : ch)));
    };

    const addChannel = () => {
        updateChannels([...config.channels, createModelChannel({ name: `渠道 ${config.channels.length + 1}` })]);
    };

    const deleteChannel = (id: string) => {
        if (config.channels.length <= 1) {
            message.warning("至少保留一个渠道");
            return;
        }
        updateChannels(config.channels.filter((ch) => ch.id !== id));
    };

    const refreshChannelModels = async (channel: ModelChannel) => {
        if (!channel.baseUrl.trim() || !channel.apiKey.trim()) {
            message.error("请先填写该渠道的 Base URL 和 API Key");
            return;
        }
        setLoadingChannelId(channel.id);
        try {
            const models = await fetchChannelModels(channel);
            updateChannels(config.channels.map((ch) => (ch.id === channel.id ? { ...ch, models } : ch)));
            message.success(`${channel.name} 模型列表已更新`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "读取模型失败");
        } finally {
            setLoadingChannelId("");
        }
    };

    const refreshAllModels = async () => {
        const runnable = config.channels.filter((ch) => ch.baseUrl.trim() && ch.apiKey.trim());
        if (!runnable.length) {
            message.error("请先填写至少一个渠道的 Base URL 和 API Key");
            return;
        }
        setLoadingChannelId("all");
        try {
            const entries = await Promise.all(runnable.map(async (ch) => [ch.id, await fetchChannelModels(ch)] as const));
            const map = new Map(entries);
            updateChannels(config.channels.map((ch) => (map.has(ch.id) ? { ...ch, models: map.get(ch.id) || [] } : ch)));
            message.success("所有渠道模型列表已更新");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "读取模型失败");
        } finally {
            setLoadingChannelId("");
        }
    };

    const updateCapabilityModels = (group: ModelGroup, models: string[]) => {
        const next = uniqueModels(models.map((m) => normalizeModelOptionValue(m, config.channels)).filter(Boolean));
        updateConfig(group.modelsKey, next);
        if (!next.includes(config[group.modelKey])) updateConfig(group.modelKey, next[0] || "");
    };

    const modelOptions = config.models.map((m) => ({ label: modelOptionLabel(config, m), value: m }));

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
            <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
                <div className="mx-auto flex max-w-4xl items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">AI Studio 管理</h1>
                        <p className="mt-0.5 text-xs text-stone-500">渠道配置 · 模型管理</p>
                    </div>
                    <Button icon={<LogOut className="size-4" />} onClick={onLogout}>
                        退出
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
                {/* 渠道管理 */}
                <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">渠道管理</h2>
                        <div className="flex gap-2">
                            <Button icon={<RefreshCw className="size-4" />} loading={Boolean(loadingChannelId)} onClick={() => void refreshAllModels()}>
                                拉取全部模型
                            </Button>
                            <Button type="primary" icon={<Plus className="size-4" />} onClick={addChannel}>
                                新增渠道
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {config.channels.map((channel) => (
                            <div key={channel.id} className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <span className="font-medium text-stone-900 dark:text-stone-100">{channel.name || "未命名"}</span>
                                        <span className="ml-2 text-xs text-stone-500">{channel.apiFormat === "gemini" ? "Gemini" : "OpenAI"} · {channel.models.length} 个模型</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="small" loading={loadingChannelId === channel.id} onClick={() => void refreshChannelModels(channel)}>
                                            拉取模型
                                        </Button>
                                        <Button size="small" danger icon={<Trash2 className="size-3.5" />} onClick={() => deleteChannel(channel.id)} />
                                    </div>
                                </div>
                                <Form layout="vertical" className="mb-0">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Form.Item label="渠道名称" className="mb-0">
                                            <Input value={channel.name} onChange={(e) => updateChannel(channel.id, { name: e.target.value })} />
                                        </Form.Item>
                                        <Form.Item label="调用格式" className="mb-0">
                                            <Select
                                                value={channel.apiFormat}
                                                options={API_FORMAT_OPTIONS}
                                                onChange={(v) => {
                                                    const baseUrl = !channel.baseUrl.trim() || channel.baseUrl === defaultBaseUrlForApiFormat(channel.apiFormat) ? defaultBaseUrlForApiFormat(v) : channel.baseUrl;
                                                    updateChannel(channel.id, { apiFormat: v, baseUrl });
                                                }}
                                            />
                                        </Form.Item>
                                        <Form.Item label="Base URL" className="mb-0">
                                            <Input value={channel.baseUrl} onChange={(e) => updateChannel(channel.id, { baseUrl: e.target.value })} placeholder="https://api.openai.com" />
                                        </Form.Item>
                                        <Form.Item label="API Key" className="mb-0">
                                            <Input.Password value={channel.apiKey} onChange={(e) => updateChannel(channel.id, { apiKey: e.target.value })} placeholder="sk-..." />
                                        </Form.Item>
                                    </div>
                                    <Form.Item label="模型列表" className="mb-0 mt-4">
                                        <Select
                                            mode="tags"
                                            value={channel.models}
                                            onChange={(v) => updateChannel(channel.id, { models: v })}
                                            placeholder="输入模型名称后回车添加，或点击「拉取模型」自动获取"
                                            tokenSeparators={[","]}
                                            style={{ width: "100%" }}
                                        />
                                    </Form.Item>
                                </Form>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 模型分配 */}
                <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <h2 className="mb-5 text-lg font-semibold text-stone-900 dark:text-stone-100">模型分配</h2>
                    <p className="mb-4 text-xs text-stone-500">从渠道模型中选择各能力的可选模型，并设置默认使用的模型。</p>
                    <div className="space-y-5">
                        {MODEL_GROUPS.map((group) => (
                            <div key={group.capability} className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                                <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">{group.label}</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Form.Item label="可选模型" className="mb-0">
                                        <Select
                                            mode="multiple"
                                            value={config[group.modelsKey]}
                                            options={modelOptions}
                                            onChange={(v) => updateCapabilityModels(group, v)}
                                            placeholder="选择该能力可用的模型"
                                            style={{ width: "100%" }}
                                        />
                                    </Form.Item>
                                    <Form.Item label="默认模型" className="mb-0">
                                        <Select
                                            value={config[group.modelKey] || undefined}
                                            options={(config[group.modelsKey] || []).map((m) => ({ label: modelOptionLabel(config, m), value: m }))}
                                            onChange={(v) => updateConfig(group.modelKey, v)}
                                            placeholder="选择默认模型"
                                            style={{ width: "100%" }}
                                        />
                                    </Form.Item>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 生成偏好 */}
                <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <h2 className="mb-5 text-lg font-semibold text-stone-900 dark:text-stone-100">生成偏好</h2>
                    <Form layout="vertical">
                        <div className="grid gap-4 md:grid-cols-4">
                            <Form.Item label="画布默认生图张数" className="mb-4">
                                <Input
                                    type="number"
                                    min={1}
                                    max={15}
                                    value={config.canvasImageCount}
                                    onChange={(e) => updateConfig("canvasImageCount", e.target.value)}
                                    onBlur={(e) => updateConfig("canvasImageCount", String(Math.max(1, Math.min(15, Math.floor(Math.abs(Number(e.target.value)) || 3)))))}
                                />
                            </Form.Item>
                            <Form.Item label="默认音频声音" className="mb-4">
                                <Select value={config.audioVoice} options={audioVoiceOptions} onChange={(v) => updateConfig("audioVoice", v)} />
                            </Form.Item>
                            <Form.Item label="默认音频格式" className="mb-4">
                                <Select value={config.audioFormat} options={audioFormatOptions} onChange={(v) => updateConfig("audioFormat", v)} />
                            </Form.Item>
                            <Form.Item label="默认音频语速" className="mb-4">
                                <Input
                                    type="number"
                                    min={0.25}
                                    max={4}
                                    step={0.05}
                                    value={config.audioSpeed}
                                    onChange={(e) => updateConfig("audioSpeed", e.target.value)}
                                    onBlur={(e) => updateConfig("audioSpeed", normalizeAudioSpeedValue(e.target.value))}
                                />
                            </Form.Item>
                        </div>
                        <Form.Item label="默认音频指令" className="mb-4">
                            <Input.TextArea rows={2} value={config.audioInstructions} placeholder="例如：自然、温暖、适合旁白。" onChange={(e) => updateConfig("audioInstructions", e.target.value)} />
                        </Form.Item>
                        <Form.Item label="系统提示词" className="mb-0">
                            <Input.TextArea rows={4} value={config.systemPrompt} placeholder="例如：你是一位擅长电影感写实摄影的视觉导演。" onChange={(e) => updateConfig("systemPrompt", e.target.value)} />
                        </Form.Item>
                    </Form>
                </section>

                <div className="pb-8 text-center text-xs text-stone-400">配置会自动保存到当前浏览器。其他用户使用默认配置（服务端代理模式）。</div>
            </main>
        </div>
    );
}
