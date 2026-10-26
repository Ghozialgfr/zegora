// ============ SCRIPT.JS - Formulir pemesanan & simulasi perjalanan Zogora ============

// ---------- A. PENGATURAN ----------
// GANTI nomor WhatsApp tujuan (format internasional, tanpa + atau spasi)
const WA_NUMBER = "62895807721010";
const SEARCH_MS = 2800; // lama "mencari pengemudi"
const TRIP_MS = 14000; // lama simulasi perjalanan di peta
const ETA_MIN = 8; // estimasi awal (menit)

const DRIVERS = [
  { name: "Razan Syabani", veh: "Honda Vesmet · D 3333 ZG" },
  { name: "Rifki Padilah", veh: "Yamaha NMAX · D 8888 ZB" },
  { name: "Raihan Riza", veh: "Honda Beat · Z 7890 ZK" },
];

// ---------- B. SIMULASI PERJALANAN (kartu rute di hero) ----------
const $ = (id) => document.getElementById(id);
const card = $("tripCard"),
  path = $("route"),
  gold = $("routeGold"),
  vehicle = $("vehicle");
const pathLen = path.getTotalLength();
gold.style.strokeDasharray = pathLen;

let tripToken = 0; // membatalkan simulasi lama bila ada pesanan baru

function setState(state, title, chip) {
  card.dataset.state = state;
  $("statusTitle").textContent = title;
  $("statusChip").textContent = chip;
}

function setProgress(p) {
  const pt = path.getPointAtLength(pathLen * p);
  vehicle.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
  gold.style.strokeDashoffset = pathLen * (1 - p);
  $("etaText").textContent =
    p >= 1 ? "Tiba" : `${Math.max(1, Math.ceil(ETA_MIN * (1 - p)))} menit lagi`;
}

function resetTrip() {
  tripToken++;
  setProgress(0);
  setState("idle", "Belum ada perjalanan", "Menunggu pesanan");
  $("etaBox").classList.add("hidden");
  $("driverInfo").classList.add("hidden");
  $("tripNote").textContent =
    "Isi formulir pemesanan untuk melihat rute dan pengemudi Anda di sini.";
}

function startTrip(jemput, tujuan) {
  const token = ++tripToken;
  const d = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];

  // Tahap 1: mencari pengemudi
  setProgress(0);
  setState("searching", "Mencari pengemudi…", "Mencari");
  $("etaBox").classList.add("hidden");
  $("driverInfo").classList.add("hidden");
  $("tripNote").textContent = `${jemput} → ${tujuan}`;

  setTimeout(() => {
    if (token !== tripToken) return;

    // Tahap 2: pengemudi ditemukan, kendaraan mulai bergerak
    $("driverName").textContent = d.name;
    $("driverVeh").textContent = d.veh;
    $("driverInit").textContent = d.name
      .split(" ")
      .map((w) => w[0])
      .join("");
    $("tripAction").textContent = "Hubungi";
    $("driverInfo").classList.remove("hidden");
    $("etaBox").classList.remove("hidden");
    setState("ontrip", "Pengemudi menuju tujuan", "Dalam perjalanan");

    const t0 = performance.now();
    (function tick(now) {
      if (token !== tripToken) return;
      const p = Math.min((now - t0) / TRIP_MS, 1);
      setProgress(p);
      if (p < 1) return requestAnimationFrame(tick);

      // Tahap 3: tiba
      setState("arrived", "Anda telah tiba", "Selesai");
      $("tripAction").textContent = "Pesan lagi";
    })(t0);
  }, SEARCH_MS);
}

// Tombol di kartu pengemudi: "Pesan lagi" saat selesai
$("tripAction").addEventListener("click", () => {
  if (card.dataset.state === "arrived") {
    resetTrip();
    $("pesan").scrollIntoView({ behavior: "smooth" });
  }
});

// ---------- C. FORMULIR PEMESANAN ----------
const form = $("orderForm"),
  msg = $("formMsg");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nama = form.nama.value.trim();
  const layanan = form.layanan.value;
  const jemput = form.titik_jemput.value.trim();
  const tujuan = form.tujuan.value.trim();

  // 1. Validasi
  if (!nama || !jemput || !tujuan) {
    msg.textContent =
      "Lengkapi nama, titik jemput, dan tujuan terlebih dahulu.";
    msg.className = "text-sm text-red-600";
    return;
  }

  // 2. Simpan riwayat ke Formspree (email) di latar belakang
  fetch(form.action, {
    method: "POST",
    body: new FormData(form),
    headers: { Accept: "application/json" },
    keepalive: true,
  }).catch(() => {});

  // 3. Buka WhatsApp dengan pesan pesanan otomatis
  const text = encodeURIComponent(
    `Halo Zogora, saya ingin memesan.\nNama: ${nama}\nLayanan: ${layanan}\nJemput: ${jemput}\nTujuan: ${tujuan}`,
  );
  window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, "_blank", "noopener");

  // 4. Aktifkan animasi perjalanan di hero
  startTrip(jemput, tujuan);
  msg.textContent = "Pesanan terkirim. Lanjutkan konfirmasi lewat WhatsApp.";
  msg.className = "text-sm text-gold2";
  form.reset();
  $("tripCard").scrollIntoView({ behavior: "smooth", block: "center" });
});
