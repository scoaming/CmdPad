import { useState } from "react";
import { X, FileUp, ClipboardPaste } from "lucide-react";
import { useStore } from "../store/useStore";
import type { Command } from "../types";

function parseText(text: string): Command[] {
  const commands: Command[] = [];
  // Split by double newline or multiple newlines to separate entries
  const entries = text.split(/\n{2,}/).filter((e) => e.trim());

  for (const entry of entries) {
    const lines = entry
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    // First non-empty line is title
    const title = lines[0].replace(/^[：:]/, "").trim();

    // Rest is command (join multiple lines if needed)
    // Skip lines that look like annotations (e.g., "Android13：")
    const cmdLines = lines.slice(1).filter((l) => {
      // Keep lines that contain commands (start with common patterns)
      return (
        l.startsWith("am ") ||
        l.startsWith("pm ") ||
        l.startsWith("dumpsys ") ||
        l.startsWith("echo ") ||
        l.startsWith("settings ") ||
        l.startsWith("git ") ||
        l.startsWith("killall ") ||
        l.startsWith("adb ") ||
        l.startsWith("fastboot ") ||
        // Or just any line that doesn't look like a pure annotation
        !/^[a-zA-Z]+[：:]/.test(l)
      );
    });

    if (cmdLines.length === 0) continue;

    const command = cmdLines.join("\n").trim();
    if (!command) continue;

    commands.push({
      id: "",
      title: title || "未命名",
      command,
      tags: [],
      usage_count: 0,
      last_used: "",
      created_at: "",
    });
  }

  return commands;
}

export default function ImportDialog() {
  const { importCommands, setShowImportDialog } = useStore();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Command[]>([]);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    const result = parseText(text);
    setParsed(result);
  };

  const handlePaste = async () => {
    try {
      const { readText } = await import(
        "@tauri-apps/plugin-clipboard-manager"
      );
      const clipboardText = await readText();
      if (clipboardText) {
        setText(clipboardText);
      }
    } catch (err) {
      console.error("读取剪贴板失败:", err);
    }
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    const count = await importCommands(parsed);
    if (count > 0) {
      setText("");
      setParsed([]);
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-slate-200">
            导入命令
          </h2>
          <button
            onClick={() => setShowImportDialog(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 flex-1 overflow-auto">
          <p className="text-xs text-slate-400">
            将你的便签文本粘贴到下方，每行命令用空行分隔。系统会自动识别标题行和命令行。
          </p>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setParsed([]);
              }}
              placeholder={`打开IST蓝色工厂菜单栏
am start -n com.ist.factory/.functionmenu.MenuActivity

打开IST工厂菜单
am start -n com.ist.factory/.factoryTest.FactoryTestActivity`}
              rows={8}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
            />
            <button
              onClick={handlePaste}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              <ClipboardPaste className="w-3 h-3" />
              粘贴
            </button>
          </div>

          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
          >
            <FileUp className="w-4 h-4" />
            解析文本
          </button>

          {/* Parsed preview */}
          {parsed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-emerald-400 font-medium">
                识别到 {parsed.length} 条命令：
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {parsed.map((cmd, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/30"
                  >
                    <span className="text-[10px] text-slate-500 mt-0.5 shrink-0">
                      {i + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">
                        {cmd.title}
                      </p>
                      <code className="text-[10px] text-slate-400 line-clamp-2 font-mono">
                        {cmd.command}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleImport}
            disabled={parsed.length === 0 || importing}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-xl transition-colors font-medium"
          >
            {importing ? "导入中..." : `导入 ${parsed.length} 条命令`}
          </button>
        </div>
      </div>
    </div>
  );
}
