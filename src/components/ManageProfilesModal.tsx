import { useState } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { useEngineConfig, type WeightProfile } from "../contexts/EngineConfigContext";

export function ManageProfilesModal({ onClose }: { onClose: () => void }) {
  const { engineConfig, activeProfile, updateProfile, addProfile, deleteProfile, setActiveProfile } = useEngineConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const handleWeightChange = (profileId: string, key: "qualityWeight" | "growthWeight" | "valueWeight" | "momentumWeight", value: number) => {
    updateProfile(profileId, { [key]: value });
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    addProfile(name, { qualityWeight: 0.25, growthWeight: 0.25, valueWeight: 0.25, momentumWeight: 0.25 });
    setNewName("");
  };

  const isDefault = (id: string) => id === "prod" || id === "res";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
          <h2 className="text-body font-bold text-white">Weight Profiles</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {engineConfig.profiles.map(p => {
            const isActive = p.id === engineConfig.activeProfileId;
            const isEditing = editingId === p.id;
            return (
              <div key={p.id} className={`rounded-xl border p-4 transition-all ${isActive ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/[0.04] bg-white/[0.01]"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-label font-bold text-white">{p.name}</span>
                    {isActive && <span className="text-caption text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Aktif</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isActive && !isDefault(p.id) && (
                      <button onClick={() => deleteProfile(p.id)} className="w-6 h-6 rounded-lg hover:bg-rose-500/10 flex items-center justify-center text-rose-400/60 hover:text-rose-400 transition-colors cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                    )}
                    {!isActive && (
                      <button onClick={() => setActiveProfile(p.id)} className="text-caption text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-colors cursor-pointer">Aktifkan</button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {(["qualityWeight", "growthWeight", "valueWeight", "momentumWeight"] as const).map(key => {
                    const label = { qualityWeight: "Quality", growthWeight: "Growth", valueWeight: "Value", momentumWeight: "Momentum" }[key];
                    const pct = Math.round((p[key] ?? 0) * 100);
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-caption mb-0.5">
                          <span className="text-white/50">{label}</span>
                          <span className="text-accent font-bold">{pct}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={pct}
                          onChange={e => handleWeightChange(p.id, key, parseInt(e.target.value) / 100)}
                          className="w-full accent-emerald-500 h-1" />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 text-caption text-white/30 text-right">
                  Total: {Math.round(((p.qualityWeight ?? 0) + (p.growthWeight ?? 0) + (p.valueWeight ?? 0) + (p.momentumWeight ?? 0)) * 100)}%
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-white/[0.04] space-y-3">
          <div className="flex gap-2">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama profile baru..."
              className="flex-1 text-caption px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none text-white placeholder:text-white/20 focus:border-white/20 transition-all"
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }} />
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="flex items-center gap-1.5 text-caption font-medium px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
              <Plus className="w-3 h-3" /> Tambah
            </button>
          </div>
          <p className="text-caption text-white/20">Total bobot otomatis disesuaikan. Profile default (F/B) tidak bisa dihapus.</p>
        </div>
      </div>
    </div>
  );
}
