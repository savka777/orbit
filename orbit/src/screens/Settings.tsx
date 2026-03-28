import { useState } from 'react'
import { Trash2 } from 'lucide-react'

type SettingsProps = {
  onClearAllData: () => void
}

export default function Settings({ onClearAllData }: SettingsProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="h-full min-h-0 overflow-y-auto px-6 pt-2 pb-6">
      <div className="mx-auto max-w-[960px]">
        <h1 className="mb-1 text-[14px] font-semibold text-stone-50">Settings</h1>
        <p className="mb-6 text-[12px] text-white/38">Manage your Orbit preferences</p>

        <div className="space-y-3">
          <div className="app-card rounded-[22px] p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[13px] font-medium text-stone-50">Delete all data</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-white/38">
                  Remove all conversations and chat history. This cannot be undone.
                </p>
              </div>
              <div className="shrink-0 ml-4">
                {confirming ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirming(false)}
                      className="cursor-pointer rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-medium text-white/58 transition-colors hover:bg-white/7"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onClearAllData()
                        setConfirming(false)
                      }}
                      className="cursor-pointer rounded-full bg-red-500/90 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-red-500 active:scale-95"
                    >
                      Confirm delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming(true)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20 active:scale-95"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    Delete all
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
