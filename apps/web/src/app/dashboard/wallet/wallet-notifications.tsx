import { createSupabaseServerClient } from "@/lib/supabase-server";
import { markWalletNotificationRead } from "./wallet-actions";

export default async function WalletNotifications() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("tsc_notifications")
    .select("id, notification_type, title, message, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Wallet notifications loading failed:", error);
    return null;
  }

  const notifications = data ?? [];
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#1D4ED8]/15 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-[#0F2952] to-[#1E3A8A] px-5 py-4 text-white sm:px-7">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#FCD34D]">
            Account updates
          </p>
          <h2 className="mt-1 text-lg font-extrabold">Wallet notifications</h2>
          <p className="mt-1 text-sm text-blue-100">
            Updates about credits and debits made to your wallet.
          </p>
        </div>

        <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white">
          {unreadCount} unread
        </span>
      </div>

      {!notifications.length ? (
        <div className="px-6 py-9 text-center">
          <p className="font-bold text-[#0F2952]">No wallet notifications</p>
          <p className="mt-1 text-sm text-slate-500">
            Wallet adjustment updates will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7 ${
                item.read_at ? "bg-white" : "bg-blue-50/60"
              }`}
            >
              <div className="flex min-w-0 gap-3">
                <span
                  className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    item.notification_type === "wallet_credit"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                  aria-hidden="true"
                >
                  {item.notification_type === "wallet_credit" ? "↓" : "↑"}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#0F2952]">
                      {item.title}
                    </h3>
                    {!item.read_at && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.message}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Africa/Lagos",
                    })}
                  </p>
                </div>
              </div>

              {!item.read_at && (
                <form action={markWalletNotificationRead}>
                  <input type="hidden" name="notificationId" value={item.id} />
                  <button
                    type="submit"
                    className="self-start rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                  >
                    Mark as read
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
