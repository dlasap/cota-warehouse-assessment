# Part 5 — Losing internet connectivity

**Save on the device first.** Every confirmed action (pick, replenishment, count) goes into an on-device **outbox** before anything is sent. If the connection drops, nothing is lost, and the app shows "3 changes waiting to sync". The prototype already does a simple version of this: confirmed changes are kept in localStorage, and the last inventory snapshot is cached so the app opens without a connection.

**No duplicate changes.** Each change gets a unique ID when it is created, and retries resend the same ID. The server ignores IDs it has already applied, so a retry after a timeout cannot deduct stock twice. The prototype's `applyMovements` already skips duplicate IDs.

**Send changes, not totals.** The device sends "pick 3 cases from A1-R2-S1", not "A1-R2-S1 now has 15", so changes from different devices combine correctly. Each change also carries the stock version the employee saw. If applying it would push stock below zero, or the stock has changed since, it is **rejected and shown for review**. It is never applied halfway or quietly merged.

**No confusing results.** The screen always says where its numbers come from: "Live" or "Offline, data from 10:42". Unsynced changes are marked "pending", and pick lists made offline warn that stock may have changed. After reconnecting, the app sends the outbox in order, reloads inventory, and lists any rejected change with its reason.
