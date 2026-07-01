import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useStore } from "../store/useStore";

export default function AddCommandForm() {
  const { addCommand, updateCommand, editingCommand, setEditingCommand } =
    useStore();

  const [title, setTitle] = useState("");
  const [command, setCommand] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const isEditing = !!editingCommand;

  useEffect(() => {
    if (editingCommand) {
      setTitle(editingCommand.title);
      setCommand(editingCommand.command);
      setTagsInput(editingCommand.tags.join(", "));
    }
  }, [editingCommand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !command.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEditing) {
      await updateCommand(editingCommand!.id, title.trim(), command.trim(), tags);
    } else {
      await addCommand(title.trim(), command.trim(), tags);
    }

    // Reset form
    setTitle("");
    setCommand("");
    setTagsInput("");
  };

  const handleClose = () => {
    setEditingCommand(null);
    setTitle("");
    setCommand("");
    setTagsInput("");
  };

  return (
    <div className="mx-4 mt-3 mb-1 bg-slate-800/90 border border-slate-700/60 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">
          {isEditing ? "编辑命令" : "新增命令"}
        </h3>
        {isEditing && (
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="命令标题（如：打开IST工厂菜单）"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
          autoFocus
        />

        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="命令内容（如：am start -n com.ist.factory/.factoryTest.FactoryTestActivity）"
          rows={3}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
        />

        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="标签，逗号分隔（如：android, ist, adb）"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
        />

        <button
          type="submit"
          disabled={!title.trim() || !command.trim()}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          {isEditing ? "保存修改" : "添加命令"}
        </button>
      </form>
    </div>
  );
}
