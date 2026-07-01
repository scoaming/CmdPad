import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Command, Settings, SortBy } from "../types";
import { setLastKnownText } from "../utils/clipboardState";

interface AppState {
  commands: Command[];
  settings: Settings;
  searchQuery: string;
  isLoading: boolean;
  showAddForm: boolean;
  showImportDialog: boolean;
  editingCommand: Command | null;

  // Actions
  loadCommands: () => Promise<void>;
  loadSettings: () => Promise<void>;
  addCommand: (title: string, command: string, tags: string[]) => Promise<void>;
  updateCommand: (id: string, title: string, command: string, tags: string[]) => Promise<void>;
  deleteCommand: (id: string) => Promise<void>;
  copyCommand: (id: string, commandText: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;
  importCommands: (commands: Command[]) => Promise<number>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  toggleAutoStart: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setShowAddForm: (show: boolean) => void;
  setShowImportDialog: (show: boolean) => void;
  setEditingCommand: (cmd: Command | null) => void;
  getFilteredCommands: () => Command[];
}

export const useStore = create<AppState>((set, get) => ({
  commands: [],
  settings: {
    clipboard_monitoring: true,
    sort_by: "frequency",
    auto_start: false,
  },
  searchQuery: "",
  isLoading: true,
  showAddForm: false,
  showImportDialog: false,
  editingCommand: null,

  loadCommands: async () => {
    try {
      const commands = await invoke<Command[]>("get_commands");
      set({ commands, isLoading: false });
    } catch (err) {
      console.error("加载命令失败:", err);
      set({ isLoading: false });
    }
  },

  loadSettings: async () => {
    try {
      const settings = await invoke<Settings>("get_settings");
      set({ settings });
    } catch (err) {
      console.error("加载设置失败:", err);
    }
  },

  addCommand: async (title, command, tags) => {
    try {
      await invoke("add_command", { title, command, tags });
      await get().loadCommands();
      set({ showAddForm: false });
    } catch (err) {
      console.error("添加命令失败:", err);
    }
  },

  updateCommand: async (id, title, command, tags) => {
    try {
      await invoke("update_command", { id, title, command, tags });
      await get().loadCommands();
      set({ editingCommand: null });
    } catch (err) {
      console.error("更新命令失败:", err);
    }
  },

  deleteCommand: async (id) => {
    try {
      await invoke("delete_command", { id });
      await get().loadCommands();
    } catch (err) {
      console.error("删除命令失败:", err);
    }
  },

  copyCommand: async (id, commandText) => {
    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(commandText);
      // Mark this text as already counted so clipboard monitor skips it
      setLastKnownText(commandText);
      await invoke("increment_usage", { id });
      await get().loadCommands();
    } catch (err) {
      console.error("复制命令失败:", err);
    }
  },

  incrementUsage: async (id) => {
    try {
      await invoke("increment_usage", { id });
      await get().loadCommands();
    } catch (err) {
      console.error("更新使用频次失败:", err);
    }
  },

  importCommands: async (commands) => {
    try {
      const added = await invoke<Command[]>("import_commands", {
        imported: commands.map((c) => ({
          id: "",
          title: c.title,
          command: c.command,
          tags: c.tags || [],
          usage_count: 0,
          last_used: "",
          created_at: "",
        })),
      });
      await get().loadCommands();
      set({ showImportDialog: false });
      return added.length;
    } catch (err) {
      console.error("导入命令失败:", err);
      return 0;
    }
  },

  updateSettings: async (newSettings) => {
    try {
      const current = get().settings;
      const merged = { ...current, ...newSettings };
      await invoke("update_settings", {
        clipboardMonitoring: merged.clipboard_monitoring,
        sortBy: merged.sort_by,
        autoStart: merged.auto_start,
      });
      set({ settings: merged });
      await get().loadCommands();
    } catch (err) {
      console.error("更新设置失败:", err);
    }
  },

  toggleAutoStart: async () => {
    try {
      const current = get().settings.auto_start;
      const newVal = !current;
      await invoke("set_autostart", { enable: newVal });
      const merged = { ...get().settings, auto_start: newVal };
      await invoke("update_settings", {
        clipboardMonitoring: merged.clipboard_monitoring,
        sortBy: merged.sort_by,
        autoStart: merged.auto_start,
      });
      set({ settings: merged });
    } catch (err) {
      console.error("切换自启动失败:", err);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setShowAddForm: (show) => set({ showAddForm: show }),

  setShowImportDialog: (show) => set({ showImportDialog: show }),

  setEditingCommand: (cmd) => set({ editingCommand: cmd }),

  getFilteredCommands: () => {
    const { commands, searchQuery } = get();
    if (!searchQuery.trim()) return commands;

    const q = searchQuery.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.command.toLowerCase().includes(q) ||
        cmd.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  },
}));
