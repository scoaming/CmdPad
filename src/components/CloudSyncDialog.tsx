import { useState } from "react";
import { X, CloudUpload, Save } from "lucide-react";
import { useStore } from "../store/useStore";
import { getCloudConfig, saveCloudConfig, uploadToCloud } from "../utils/cloudSync";

interface Props {
  onClose: () => void;
}

export default function CloudSyncDialog({ onClose }: Props) {
  const { commands } = useStore();
  const saved = getCloudConfig();
  const [url, setUrl] = useState(saved.url);
  const [token, setToken] = useState(saved.token);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleUpload = async () => {
    saveCloudConfig({ url, token });
    setBusy(true);
    setMessage("");
    try {
      const msg = await uploadToCloud(commands);
      setMessage(msg);
      setIsError(false);
    } catch (err) {
      setMessage(String(err));
      setIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[520px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-slate-200">手机端同步（Cloudflare PWA）</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 flex-1 overflow-auto">
          <p className="text-xs text-slate-400 leading-relaxed">
            先部署 cloud/ 目录下的 Worker（步骤见仓库 <code className="text-slate-300 bg-slate-800 px-1 rounded">cloud/DEPLOY.md</code>），
            然后把 Worker 地址和访问令牌填在下面。上传后，手机浏览器打开 Worker 地址、
            输入令牌即可查看 / 搜索 / 一键复制命令，也可「添加到主屏幕」当 App 用。
          </p>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Worker 地址</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cmdpad-web.你的子域.workers.dev"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">访问令牌（DATA_TOKEN）</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="部署 Worker 时设置的秘密令牌"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          {message && (
            <p className={`text-xs px-3 py-2 rounded-lg ${isError ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 flex gap-2">
          <button
            onClick={() => {
              saveCloudConfig({ url, token });
              setMessage("配置已保存");
              setIsError(false);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-xl transition-colors"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
          <button
            onClick={handleUpload}
            disabled={busy || !url.trim() || !token.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-xl transition-colors font-medium"
          >
            <CloudUpload className="w-4 h-4" />
            {busy ? "上传中..." : `上传 ${commands.length} 条命令`}
          </button>
        </div>
      </div>
    </div>
  );
}
