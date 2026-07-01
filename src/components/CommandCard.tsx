import { useState } from "react";
import { Copy, Check, Edit2, Trash2, Hash } from "lucide-react";
import type { Command } from "../types";
import { useStore } from "../store/useStore";

interface Props {
  command: Command;
  index: number;
}

export default function CommandCard({ command, index }: Props) {
  const { copyCommand, deleteCommand, setEditingCommand } = useStore();
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleCopy = async () => {
    await copyCommand(command.id, command.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = async () => {
    await deleteCommand(command.id);
    setShowDelete(false);
  };

  // Determine the rank badge color
  const rankColors = [
    "bg-yellow-500 text-yellow-950", // #1 gold
    "bg-slate-400 text-slate-900", // #2 silver
    "bg-amber-700 text-amber-100", // #3 bronze
  ];
  const rankBadge =
    index < 3 && command.usage_count > 0
      ? rankColors[index]
      : "bg-slate-700 text-slate-300";

  return (
    <div className="group relative bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 hover:border-slate-600/80 hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md">
      {/* Card top border accent based on rank */}
      {index < 3 && command.usage_count > 0 && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${
            index === 0
              ? "bg-yellow-500"
              : index === 1
                ? "bg-slate-400"
                : "bg-amber-700"
          }`}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Left side: title + command */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-200 truncate">
              {command.title}
            </h3>
            {/* Usage count badge */}
            {command.usage_count > 0 && (
              <span
                className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${rankBadge}`}
              >
                {index + 1}
              </span>
            )}
            {command.usage_count > 0 && (
              <span className="text-[10px] text-slate-500">
                已使用 {command.usage_count} 次
              </span>
            )}
          </div>

          {/* Command text */}
          <div className="relative">
            <code className="block text-xs font-mono text-slate-300 bg-slate-900/80 rounded-lg px-3 py-2.5 break-all border border-slate-700/50 leading-relaxed whitespace-pre-wrap">
              {command.command}
            </code>
          </div>

          {/* Tags */}
          {command.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Hash className="w-3 h-3 text-slate-500" />
              {command.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side: action buttons */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-all duration-200 ${
              copied
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white"
            }`}
            title="复制命令"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Edit button */}
          <button
            onClick={() => setEditingCommand(command)}
            className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400 transition-all"
            title="编辑"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            onClick={() => setShowDelete(true)}
            className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {showDelete && (
        <div className="absolute inset-0 bg-slate-900/95 rounded-xl flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm text-slate-300 mb-3">确定要删除此命令吗？</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                删除
              </button>
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-1.5 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
