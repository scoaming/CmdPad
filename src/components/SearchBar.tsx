import { Search } from "lucide-react";
import { useStore } from "../store/useStore";
import type { SortBy } from "../types";

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "frequency", label: "按频次" },
  { value: "recent", label: "按最近" },
  { value: "alpha", label: "按字母" },
];

export default function SearchBar() {
  const { searchQuery, setSearchQuery, settings, updateSettings } = useStore();

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-700/50">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索命令、标题或标签..."
          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Sort toggle */}
      <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateSettings({ sort_by: opt.value })}
            className={`px-2.5 py-1.5 text-xs rounded-md transition-all ${
              settings.sort_by === opt.value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
