import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

const brand = {
    light: {
        primary: "#4f46e5",
        primaryHover: "#4338ca",
        primaryText: "#ffffff",
        menuBg: "#eef2ff",
        menuText: "#312e81",
        selectActiveBg: "#eef2ff",
        selectSelectedBg: "#e0e7ff",
        selectText: "#312e81",
        tableSelectedBg: "rgba(79, 70, 229, 0.06)",
        tableSelectedHoverBg: "rgba(79, 70, 229, 0.10)",
    },
    dark: {
        primary: "#818cf8",
        primaryHover: "#a5b4fc",
        primaryText: "#1e1b4b",
        menuBg: "#1e1b4b",
        menuText: "#e0e7ff",
        selectActiveBg: "#1e1b4b",
        selectSelectedBg: "#312e81",
        selectText: "#e0e7ff",
        tableSelectedBg: "rgba(129, 140, 248, 0.10)",
        tableSelectedHoverBg: "rgba(129, 140, 248, 0.15)",
    },
};

export function getAntThemeConfig(dark: boolean): ThemeConfig {
    const color = dark ? brand.dark : brand.light;

    return {
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        cssVar: { key: dark ? "infinite-canvas-dark" : "infinite-canvas-light" },
        token: {
            colorPrimary: color.primary,
            colorInfo: color.primary,
            colorLink: color.primary,
            colorLinkHover: color.primaryHover,
            colorLinkActive: color.primary,
            colorTextLightSolid: color.primaryText,
            borderRadius: 8,
        },
        components: {
            Button: {
                primaryShadow: "0 1px 2px 0 rgba(79, 70, 229, 0.15)",
            },
            Menu: {
                itemActiveBg: color.menuBg,
                itemHoverBg: color.menuBg,
                itemSelectedBg: color.menuBg,
                itemSelectedColor: color.menuText,
                darkItemHoverBg: brand.dark.menuBg,
                darkItemSelectedBg: brand.dark.menuBg,
                darkItemSelectedColor: brand.dark.menuText,
            },
            Select: {
                optionActiveBg: color.selectActiveBg,
                optionSelectedBg: color.selectSelectedBg,
                optionSelectedColor: color.selectText,
            },
            Table: {
                rowSelectedBg: color.tableSelectedBg,
                rowSelectedHoverBg: color.tableSelectedHoverBg,
            },
        },
    };
}
