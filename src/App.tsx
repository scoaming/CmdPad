import { useEffect, useCallback, useRef } from "react";
import { Plus, Download, Zap, ZapOff, Power } from "lucide-react";
import { useStore } from "./store/useStore";
import { getLastKnownText, setLastKnownText } from "./utils/clipboardState";
import SearchBar from "./components/SearchBar";
import CommandCard from "./components/CommandCard";
import AddCommandForm from "./components/AddCommandForm";
import ImportDialog from "./components/ImportDialog";

export default function App() {
  const {
    commands,
    settings,
    isLoading,
    showAddForm,
    showImportDialog,
    editingCommand,
    loadCommands,
    loadSettings,
    setShowAddForm,
    setShowImportDialog,
    getFilteredCommands,
    incrementUsage,
    updateSettings,
    toggleAutoStart,
  } = useStore();

  const filteredCommands = getFilteredCommands();
  const clipboardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load data on mount
  useEffect(() => {
    loadCommands();
    loadSettings();
    // Sync auto-start state with registry
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const regEnabled = await invoke<boolean>("get_autostart");
        if (regEnabled !== settings.auto_start) {
          await updateSettings({ auto_start: regEnabled });
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Clipboard monitoring - check periodically
  useEffect(() => {
    if (settings.clipboard_monitoring && commands.length > 0) {
      // Clear previous timer
      if (clipboardTimerRef.current) {
        clearInterval(clipboardTimerRef.current);
      }

      clipboardTimerRef.current = setInterval(async () => {
        try {
          const { readText } = await import(
            "@tauri-apps/plugin-clipboard-manager"
          );
          const text = await readText();
          if (text && text.trim()) {
            const trimmed = text.trim();
            // Only trigger if clipboard content actually changed
            if (trimmed === getLastKnownText()) return;
            setLastKnownText(trimmed);
            // Find matching command
            const match = commands.find(
              (cmd) => cmd.command.trim() === trimmed
            );
            if (match) {
              await incrementUsage(match.id);
            }
          }
        } catch {
          // Clipboard read failed, ignore
        }
      }, 1000); // Check every 1 second

      return () => {
        if (clipboardTimerRef.current) {
          clearInterval(clipboardTimerRef.current);
        }
      };
    }
  }, [settings.clipboard_monitoring, commands.length]);

  // Keyboard shortcut: Ctrl+N to toggle add form
  // Use capture phase to intercept before browser/WebView consumes the event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Toggle: close if form is open, open if closed
        const store = useStore.getState();
        if (store.showAddForm || store.editingCommand) {
          setShowAddForm(false);
          store.setEditingCommand(null);
        } else {
          setShowAddForm(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-slate-200">CmdPad</h1>
          <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {commands.length} 条命令
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Auto-start toggle */}
          <button
            onClick={toggleAutoStart}
            className={`p-2 rounded-lg transition-all text-xs ${
              settings.auto_start
                ? "bg-purple-500/20 text-purple-400"
                : "bg-slate-800 text-slate-500"
            }`}
            title={
              settings.auto_start ? "开机自启已开启" : "开机自启已关闭"
            }
          >
            <Power className="w-4 h-4" />
          </button>

          {/* Clipboard monitoring toggle */}
          <button
            onClick={() =>
              updateSettings({
                clipboard_monitoring: !settings.clipboard_monitoring,
              })
            }
            className={`p-2 rounded-lg transition-all text-xs ${
              settings.clipboard_monitoring
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-800 text-slate-500"
            }`}
            title={
              settings.clipboard_monitoring
                ? "剪贴板监听已开启"
                : "剪贴板监听已关闭"
            }
          >
            {settings.clipboard_monitoring ? (
              <Zap className="w-4 h-4" />
            ) : (
              <ZapOff className="w-4 h-4" />
            )}
          </button>

          {/* Import button */}
          <button
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors border border-slate-700/50"
          >
            <Download className="w-3.5 h-3.5" />
            导入
          </button>

          {/* Add button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新增
          </button>
        </div>
      </header>

      {/* Search bar */}
      <SearchBar />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm text-slate-500">加载中...</span>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Add form (conditional) */}
            {(showAddForm || editingCommand) && <AddCommandForm />}

            {/* Empty state */}
            {filteredCommands.length === 0 && !showAddForm && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/30 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-sm mb-1">
                  {commands.length === 0
                    ? "还没有命令，点击「新增」或「导入」开始使用"
                    : "没有匹配的命令"}
                </p>
                <p className="text-xs text-slate-600">
                  按 Ctrl+N 快速新增命令
                </p>
              </div>
            )}

            {/* Command cards */}
            {filteredCommands.map((cmd, index) => (
              <CommandCard key={cmd.id} command={cmd} index={index} />
            ))}

            {/* Bottom padding */}
            <div className="h-4" />
          </div>
        )}
      </main>

      {/* Import dialog */}
      {showImportDialog && <ImportDialog />}
    </div>
  );
}
