#!/usr/bin/env node
/**
 * Idempotent catalog seeder: populates 30 realistic products across all 14 categories
 * into the active verified Seller store so both Seller Center and Buyer Marketplace are richly stocked.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const prisma = require('../config/prisma');
const env = require('../config/env');

const CATALOG = [
  // 1. ELEKTRONIK
  {
    categorySlug: 'elektronik',
    name: 'Smartphone ProMax 5G 8/256GB Layar AMOLED 120Hz',
    slug: 'smartphone-promax-5g-256gb',
    sku: 'ELK-001',
    price: 4599000,
    compareAtPrice: 5299000,
    stock: 25,
    weightGrams: 450,
    isFlashSale: true,
    flashSalePrice: 4199000,
    isFeatured: true,
    soldCount: 48,
    ratingAvg: 4.9,
    description: 'Smartphone 5G generasi terbaru dengan layar AMOLED 6.7 inci 120Hz, kamera utama 108MP OIS, baterai 5000mAh dengan pengisian cepat 67W, dan garansi resmi 1 tahun.',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Warna', value: 'Hitam Titanium', priceAdjustment: 0, stock: 15 },
      { name: 'Warna', value: 'Biru Midnight', priceAdjustment: 0, stock: 10 },
    ],
  },
  {
    categorySlug: 'elektronik',
    name: 'Headphone Wireless ANC Bluetooth 5.3 Bass Pro',
    slug: 'headphone-wireless-anc-bass-pro',
    sku: 'ELK-002',
    price: 549000,
    compareAtPrice: 799000,
    stock: 40,
    weightGrams: 350,
    isFlashSale: true,
    flashSalePrice: 449000,
    isFeatured: true,
    soldCount: 82,
    ratingAvg: 4.8,
    description: 'Headphone over-ear dengan Active Noise Cancellation hingga 40dB, daya tahan baterai 50 jam, bantalan memory foam super nyaman, dan kabel AUX cadangan.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Warna', value: 'Matte Black', priceAdjustment: 0, stock: 22 },
      { name: 'Warna', value: 'Silver Mist', priceAdjustment: 20000, stock: 18 },
    ],
  },
  {
    categorySlug: 'elektronik',
    name: 'Smartwatch AMOLED GPS Water Resistant 5ATM',
    slug: 'smartwatch-amoled-gps-5atm',
    sku: 'ELK-003',
    price: 699000,
    compareAtPrice: 899000,
    stock: 30,
    weightGrams: 200,
    isFlashSale: false,
    isFeatured: true,
    soldCount: 61,
    ratingAvg: 4.9,
    description: 'Smartwatch layar AMOLED Always-On, dilengkapi GPS bawaan, pemantau detak jantung & SpO2 24 jam, lebih dari 100 mode olahraga, dan baterai tahan 14 hari.',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Strap', value: 'Silikon Hitam', priceAdjustment: 0, stock: 18 },
      { name: 'Strap', value: 'Oranye Sport', priceAdjustment: 15000, stock: 12 },
    ],
  },

  // 2. FASHION PRIA
  {
    categorySlug: 'fashion-pria',
    name: 'Jaket Bomber Pria Canvas Water Repellent Premium',
    slug: 'jaket-bomber-pria-canvas-premium',
    sku: 'FPR-001',
    price: 249000,
    compareAtPrice: 349000,
    stock: 45,
    weightGrams: 650,
    isFlashSale: true,
    flashSalePrice: 199000,
    isFeatured: true,
    soldCount: 95,
    ratingAvg: 4.8,
    description: 'Jaket bomber kasual pria berbahan taslan canvas anti angin & tahan cipratan air, furing dalam lembut tidak gerah, cocok untuk berkendara dan hangout.',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Ukuran', value: 'M', priceAdjustment: 0, stock: 15 },
      { name: 'Ukuran', value: 'L', priceAdjustment: 0, stock: 15 },
      { name: 'Ukuran', value: 'XL', priceAdjustment: 10000, stock: 15 },
    ],
  },
  {
    categorySlug: 'fashion-pria',
    name: 'Sepatu Sneakers Pria Urban Runner Breathable',
    slug: 'sepatu-sneakers-pria-urban-runner',
    sku: 'FPR-002',
    price: 329000,
    compareAtPrice: 450000,
    stock: 36,
    weightGrams: 850,
    isFlashSale: false,
    isFeatured: true,
    soldCount: 74,
    ratingAvg: 4.9,
    description: 'Sneakers ringan dengan upper mesh breathable dan outsole Phylon anti slip empuk, ideal untuk aktivitas harian, kuliah, maupun jalan santai.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Ukuran', value: '41', priceAdjustment: 0, stock: 12 },
      { name: 'Ukuran', value: '42', priceAdjustment: 0, stock: 14 },
      { name: 'Ukuran', value: '43', priceAdjustment: 0, stock: 10 },
    ],
  },

  // 3. FASHION WANITA
  {
    categorySlug: 'fashion-wanita',
    name: 'Tas Selempang Wanita Kulit Sintetis Elegan Minimalis',
    slug: 'tas-selempang-wanita-elegan-minimalis',
    sku: 'FWN-001',
    price: 185000,
    compareAtPrice: 265000,
    stock: 50,
    weightGrams: 450,
    isFlashSale: true,
    flashSalePrice: 149000,
    isFeatured: true,
    soldCount: 112,
    ratingAvg: 4.9,
    description: 'Tas selempang wanita desain modern berbahan PU leather halus premium dengan tali panjang adjustable, kompartemen luas muat HP, dompet, dan kosmetik harian.',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Warna', value: 'Cream Latte', priceAdjustment: 0, stock: 25 },
      { name: 'Warna', value: 'Hitam Klasik', priceAdjustment: 0, stock: 25 },
    ],
  },
  {
    categorySlug: 'fashion-wanita',
    name: 'Dress Midi Wanita Katun Linen Floral Casual',
    slug: 'dress-midi-wanita-katun-linen-floral',
    sku: 'FWN-002',
    price: 215000,
    compareAtPrice: 289000,
    stock: 30,
    weightGrams: 380,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 54,
    ratingAvg: 4.8,
    description: 'Dress midi adem berbahan katun linen import berkualitas tinggi, potongan jatuh elegan dan nyaman dipakai seharian untuk acara santai maupun semi-formal.',
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Ukuran', value: 'S/M', priceAdjustment: 0, stock: 15 },
      { name: 'Ukuran', value: 'L/XL', priceAdjustment: 10000, stock: 15 },
    ],
  },

  // 4. KECANTIKAN
  {
    categorySlug: 'kecantikan',
    name: 'Serum Vitamin C + Niacinamide Brightening Glow 30ml',
    slug: 'serum-vitamin-c-niacinamide-glow-30ml',
    sku: 'KCT-001',
    price: 98000,
    compareAtPrice: 145000,
    stock: 80,
    weightGrams: 150,
    isFlashSale: true,
    flashSalePrice: 79000,
    isFeatured: true,
    soldCount: 164,
    ratingAvg: 4.9,
    description: 'Serum pencerah wajah dengan kombinasi Vitamin C 10%, Niacinamide 5%, dan Hyaluronic Acid. Membantu menyamarkan noda hitam, melembapkan, dan membuat kulit tampak glowing alami.',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },
  {
    categorySlug: 'kecantikan',
    name: 'Eau De Parfum Unisex Fresh Woody Long Lasting 50ml',
    slug: 'eau-de-parfum-fresh-woody-50ml',
    sku: 'KCT-002',
    price: 165000,
    compareAtPrice: 220000,
    stock: 45,
    weightGrams: 280,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 67,
    ratingAvg: 4.8,
    description: 'Parfum EDP aroma bergamot segar berpadu cedarwood dan white musk yang elegan. Tahan 8–10 jam pemakaian harian tanpa meninggalkan noda di pakaian.',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },

  // 5. KESEHATAN
  {
    categorySlug: 'kesehatan',
    name: 'Multivitamin Imun Harian Vitamin C D3 & Zinc (60 Kapsul)',
    slug: 'multivitamin-imun-c-d3-zinc-60',
    sku: 'KSH-001',
    price: 125000,
    compareAtPrice: 159000,
    stock: 70,
    weightGrams: 200,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 89,
    ratingAvg: 4.9,
    description: 'Suplemen harian untuk menjaga daya tahan tubuh dengan kombinasi Vitamin C 500mg, Vitamin D3 1000 IU, dan Zinc Picolinate. Aman dikonsumsi setiap hari.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },
  {
    categorySlug: 'kesehatan',
    name: 'Tensimeter Digital Lengan Otomatis Layar LCD Besar',
    slug: 'tensimeter-digital-lengan-otomatis',
    sku: 'KSH-002',
    price: 279000,
    compareAtPrice: 360000,
    stock: 25,
    weightGrams: 500,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 41,
    ratingAvg: 4.8,
    description: 'Alat pengukur tekanan darah digital akurat dengan memori 2 pengguna (90 data masing-masing), deteksi detak jantung tidak teratur, dan fitur mati otomatis.',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },

  // 6. RUMAH TANGGA
  {
    categorySlug: 'rumah-tangga',
    name: 'Coffee Maker Drip Otomatis 600ml + Teko Kaca Tahan Panas',
    slug: 'coffee-maker-drip-otomatis-600ml',
    sku: 'RMT-001',
    price: 389000,
    compareAtPrice: 499000,
    stock: 28,
    weightGrams: 1600,
    isFlashSale: true,
    flashSalePrice: 329000,
    isFeatured: true,
    soldCount: 53,
    ratingAvg: 4.8,
    description: 'Mesin pembuat kopi otomatis daya rendah 550W dengan filter permanen yang mudah dicuci, fitur penghangat otomatis, dan teko kaca borosilikat 600ml.',
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },
  {
    categorySlug: 'rumah-tangga',
    name: 'Lampu Meja Belajar LED Minimalis Touch Dimmer USB',
    slug: 'lampu-meja-led-minimalis-dimmer',
    sku: 'RMT-002',
    price: 119000,
    compareAtPrice: 165000,
    stock: 55,
    weightGrams: 450,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 77,
    ratingAvg: 4.7,
    description: 'Lampu meja LED ramah mata tanpa kedipan dengan 3 mode warna cahaya (Warm, Natural, Cool White), kontrol sentuh, dan baterai isi ulang USB Type-C.',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },

  // 7. MAKANAN DAN MINUMAN
  {
    categorySlug: 'makanan-dan-minuman',
    name: 'Kopi Arabika Gayo Specialty Roast 250g (Biji / Bubuk)',
    slug: 'kopi-arabika-gayo-specialty-250g',
    sku: 'MKN-001',
    price: 78000,
    compareAtPrice: 95000,
    stock: 90,
    weightGrams: 300,
    isFlashSale: false,
    isFeatured: true,
    soldCount: 145,
    ratingAvg: 4.9,
    description: 'Biji kopi 100% Arabika Aceh Gayo single origin hasil sangrai fresh medium roast dengan karakter aroma karamel, cokelat, dan keasaman buah yang seimbang.',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Gilingan', value: 'Biji Utuh', priceAdjustment: 0, stock: 45 },
      { name: 'Gilingan', value: 'Bubuk Halus', priceAdjustment: 0, stock: 45 },
    ],
  },
  {
    categorySlug: 'makanan-dan-minuman',
    name: 'Matcha Latte Powder Jepang Uji Ceremonial Grade 200g',
    slug: 'matcha-latte-powder-uji-200g',
    sku: 'MKN-002',
    price: 89000,
    compareAtPrice: 115000,
    stock: 60,
    weightGrams: 250,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 63,
    ratingAvg: 4.8,
    description: 'Bubuk teh hijau matcha asli dengan warna hijau pekat, rasa umami lembut tidak pahit, cocok untuk es matcha latte, dessert, maupun smoothies.',
    image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },

  // 8. OLAHRAGA
  {
    categorySlug: 'olahraga',
    name: 'Matras Yoga Anti Slip TPE Tebal 8mm + Tas Strap',
    slug: 'matras-yoga-anti-slip-tpe-8mm',
    sku: 'OLR-001',
    price: 159000,
    compareAtPrice: 219000,
    stock: 40,
    weightGrams: 1100,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 58,
    ratingAvg: 4.8,
    description: 'Matras yoga dan workout berbahan TPE ramah lingkungan, empuk tebal 8mm melindungi lutut & siku, tekstur anti selip dua sisi, gratis tas jaring + tali pengikat.',
    image: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Warna', value: 'Navy Blue', priceAdjustment: 0, stock: 20 },
      { name: 'Warna', value: 'Sage Green', priceAdjustment: 0, stock: 20 },
    ],
  },
  {
    categorySlug: 'olahraga',
    name: 'Set Dumbbell Adjustable 10kg Anti Karat Home Gym',
    slug: 'set-dumbbell-adjustable-10kg',
    sku: 'OLR-002',
    price: 299000,
    compareAtPrice: 389000,
    stock: 20,
    weightGrams: 10000,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 34,
    ratingAvg: 4.7,
    description: 'Set barbel/dumbbell bongkar pasang total 10kg dengan grip anti slip ergonomis dan kunci pengaman ganda, cocok untuk latihan otot di rumah.',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },

  // 9. OTOMOTIF
  {
    categorySlug: 'otomotif',
    name: 'Helm Full Face SNI Double Visor Aerodinamis',
    slug: 'helm-full-face-sni-double-visor',
    sku: 'OTM-001',
    price: 485000,
    compareAtPrice: 595000,
    stock: 24,
    weightGrams: 1700,
    isFlashSale: false,
    isFeatured: true,
    soldCount: 44,
    ratingAvg: 4.9,
    description: 'Helm full face standar SNI dengan batok ABS high impact, visor anti gores + sun visor dalam, ventilasi udara optimal, dan busa pipi yang dapat dilepas untuk dicuci.',
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Ukuran', value: 'M', priceAdjustment: 0, stock: 8 },
      { name: 'Ukuran', value: 'L', priceAdjustment: 0, stock: 10 },
      { name: 'Ukuran', value: 'XL', priceAdjustment: 0, stock: 6 },
    ],
  },
  {
    categorySlug: 'otomotif',
    name: 'Pompa Ban Portable Elektrik Digital LED Mobil & Motor',
    slug: 'pompa-ban-portable-elektrik-digital',
    sku: 'OTM-002',
    price: 235000,
    compareAtPrice: 310000,
    stock: 35,
    weightGrams: 600,
    isFlashSale: true,
    flashSalePrice: 189000,
    isFeatured: false,
    soldCount: 71,
    ratingAvg: 4.8,
    description: 'Kompresor angin mini nirkabel dengan layar tekanan PSI digital, auto-stop saat tekanan tercapai, senter LED darurat, dan bisa mengisi ban motor, mobil, hingga bola.',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },

  // 10. GAMING
  {
    categorySlug: 'gaming',
    name: 'Keyboard Mechanical Gaming RGB 75% Hot-Swappable',
    slug: 'keyboard-mechanical-gaming-rgb-75',
    sku: 'GMG-001',
    price: 589000,
    compareAtPrice: 749000,
    stock: 30,
    weightGrams: 950,
    isFlashSale: true,
    flashSalePrice: 499000,
    isFeatured: true,
    soldCount: 103,
    ratingAvg: 4.9,
    description: 'Keyboard mekanikal layout 75% ringkas dengan gasket mount empuk, keycaps PBT double-shot, 18 efek lampu RGB, koneksi tri-mode (USB-C, 2.4GHz, Bluetooth), dan switch hot-swap.',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Switch', value: 'Red Linear (Silent)', priceAdjustment: 0, stock: 15 },
      { name: 'Switch', value: 'Brown Tactile', priceAdjustment: 0, stock: 15 },
    ],
  },
  {
    categorySlug: 'gaming',
    name: 'Mouse Gaming Wireless Ultralight 58g Sensor 26K DPI',
    slug: 'mouse-gaming-wireless-ultralight-58g',
    sku: 'GMG-002',
    price: 429000,
    compareAtPrice: 549000,
    stock: 35,
    weightGrams: 250,
    isFlashSale: false,
    isFeatured: true,
    soldCount: 86,
    ratingAvg: 4.9,
    description: 'Mouse esports super ringan 58 gram dengan sensor optik presisi 26.000 DPI, polling rate 1000Hz zero-delay, switch tahan 80 juta klik, dan PTFE feet super licin.',
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Warna', value: 'Obsidian Black', priceAdjustment: 0, stock: 20 },
      { name: 'Warna', value: 'Arctic White', priceAdjustment: 15000, stock: 15 },
    ],
  },

  // 11. PERALATAN KOMPUTER
  {
    categorySlug: 'peralatan-komputer',
    name: 'Laptop Ultrabook 14" Core i5 RAM 16GB SSD 512GB NVMe',
    slug: 'laptop-ultrabook-14-i5-16gb-512gb',
    sku: 'KMP-001',
    price: 8499000,
    compareAtPrice: 9599000,
    stock: 12,
    weightGrams: 2200,
    isFlashSale: true,
    flashSalePrice: 7999000,
    isFeatured: true,
    soldCount: 29,
    ratingAvg: 4.9,
    description: 'Laptop tipis bodi aluminium ringan 1.3kg, layar IPS Full HD 100% sRGB, prosesor kencang untuk kerja, coding, dan desain, RAM 16GB + SSD NVMe 512GB, garansi resmi 2 tahun.',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Storage', value: '512GB SSD', priceAdjustment: 0, stock: 8 },
      { name: 'Storage', value: '1TB SSD', priceAdjustment: 750000, stock: 4 },
    ],
  },
  {
    categorySlug: 'peralatan-komputer',
    name: 'Monitor IPS 24 Inci Full HD 100Hz Frameless Eye-Care',
    slug: 'monitor-ips-24-fhd-100hz-frameless',
    sku: 'KMP-002',
    price: 1549000,
    compareAtPrice: 1899000,
    stock: 18,
    weightGrams: 4200,
    isFlashSale: false,
    isFeatured: true,
    soldCount: 47,
    ratingAvg: 4.8,
    description: 'Monitor panel IPS 24 inci bezel tipis dengan refresh rate 100Hz, fitur Low Blue Light, port HDMI & VGA, serta dukungan VESA mount untuk setup kerja rapi.',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },

  // 12. AKSESORIS
  {
    categorySlug: 'aksesoris',
    name: 'Kacamata Anti Radiasi Blueray Frame Titanium Ringan',
    slug: 'kacamata-anti-radiasi-blueray-titanium',
    sku: 'AKS-001',
    price: 115000,
    compareAtPrice: 169000,
    stock: 60,
    weightGrams: 150,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 92,
    ratingAvg: 4.8,
    description: 'Kacamata pelindung mata dari sinar biru layar laptop & HP, frame alloy titanium super ringan tidak menekan hidung, termasuk hardcase dan kain microfiber.',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },
  {
    categorySlug: 'aksesoris',
    name: 'Dompet Kulit Pria Minimalis RFID Blocking Slim Wallet',
    slug: 'dompet-kulit-pria-rfid-slim',
    sku: 'AKS-002',
    price: 139000,
    compareAtPrice: 199000,
    stock: 50,
    weightGrams: 180,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 68,
    ratingAvg: 4.9,
    description: 'Dompet kulit sapi asli desain slim dengan lapisan pelindung RFID anti pencurian data kartu, 8 slot kartu, dan kemasan box eksklusif cocok untuk hadiah.',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Warna', value: 'Cokelat Espresso', priceAdjustment: 0, stock: 25 },
      { name: 'Warna', value: 'Hitam Jet', priceAdjustment: 0, stock: 25 },
    ],
  },

  // 13. PERLENGKAPAN BAYI
  {
    categorySlug: 'perlengkapan-bayi',
    name: 'Set Pakaian Bayi Katun Organik Lembut 5-in-1 Gift Box',
    slug: 'set-pakaian-bayi-katun-organik-5in1',
    sku: 'BYI-001',
    price: 169000,
    compareAtPrice: 225000,
    stock: 35,
    weightGrams: 400,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 51,
    ratingAvg: 4.9,
    description: 'Paket pakaian bayi newborn 0–6 bulan berbahan 100% katun organik bersertifikat OEKO-TEX, sangat lembut, breathable, dan aman untuk kulit sensitif bayi.',
    image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
    variants: [
      { name: 'Motif', value: 'Pastel Bear', priceAdjustment: 0, stock: 18 },
      { name: 'Motif', value: 'Cloud Cream', priceAdjustment: 0, stock: 17 },
    ],
  },
  {
    categorySlug: 'perlengkapan-bayi',
    name: 'Tas Diaper Ransel Ibu & Bayi Waterproof USB Warmer',
    slug: 'tas-diaper-ransel-bayi-waterproof',
    sku: 'BYI-002',
    price: 229000,
    compareAtPrice: 299000,
    stock: 28,
    weightGrams: 750,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 39,
    ratingAvg: 4.8,
    description: 'Ransel perlengkapan bayi kapasitas besar berbahan kain Oxford tahan air, dilengkapi 3 kantong botol aluminium foil penahan hangat dan slot tisu basah cepat akses.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },

  // 14. BUKU
  {
    categorySlug: 'buku',
    name: 'Buku Panduan Full-Stack JavaScript Modern (React & Node.js)',
    slug: 'buku-fullstack-javascript-react-nodejs',
    sku: 'BKU-001',
    price: 118000,
    compareAtPrice: 149000,
    stock: 60,
    weightGrams: 480,
    isFlashSale: false,
    isFeatured: true,
    soldCount: 79,
    ratingAvg: 4.9,
    description: 'Buku pemrograman praktis berbahasa Indonesia membahas React, Vite, Express.js, Prisma ORM, PostgreSQL, REST API, keamanan JWT, hingga studi kasus membangun marketplace nyata.',
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },
  {
    categorySlug: 'buku',
    name: 'Buku Strategi Bisnis Digital & E-Commerce Modern (Hardcover)',
    slug: 'buku-strategi-bisnis-digital-ecommerce',
    sku: 'BKU-002',
    price: 105000,
    compareAtPrice: 135000,
    stock: 45,
    weightGrams: 420,
    isFlashSale: false,
    isFeatured: false,
    soldCount: 46,
    ratingAvg: 4.8,
    description: 'Panduan lengkap membangun brand, manajemen stok, optimasi konversi toko online, dan strategi pemasaran digital untuk UMKM dan seller marketplace.',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    variants: [],
  },
];

async function main() {
  const seller = await prisma.sellerProfile.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!seller) {
    throw new Error('Belum ada akun Seller di database. Daftar Seller terlebih dahulu.');
  }

  const categories = await prisma.category.findMany();
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const flashSaleEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of CATALOG) {
    const categoryId = catBySlug.get(item.categorySlug);
    if (!categoryId) {
      console.warn(`⚠️ Kategori tidak ditemukan: ${item.categorySlug}`);
      continue;
    }

    const exists = await prisma.product.findUnique({ where: { slug: item.slug } });
    if (exists) {
      skippedCount++;
      continue;
    }

    const totalStock =
      item.variants && item.variants.length > 0
        ? item.variants.reduce((sum, v) => sum + v.stock, 0)
        : item.stock;

    await prisma.product.create({
      data: {
        sellerId: seller.id,
        categoryId,
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        description: item.description,
        price: item.price,
        compareAtPrice: item.compareAtPrice || null,
        stock: totalStock,
        weightGrams: item.weightGrams,
        condition: 'NEW',
        status: 'ACTIVE',
        isFlashSale: Boolean(item.isFlashSale),
        flashSalePrice: item.isFlashSale ? item.flashSalePrice : null,
        flashSaleEndsAt: item.isFlashSale ? flashSaleEnd : null,
        isFeatured: Boolean(item.isFeatured),
        soldCount: item.soldCount || 0,
        ratingAvg: item.ratingAvg || 4.8,
        reviewCount: Math.max(5, Math.floor((item.soldCount || 10) / 3)),
        qrCodeUrl: `${env.appUrl}/products/${item.slug}?src=qr`,
        images: {
          create: [
            {
              imageUrl: item.image,
              altText: item.name,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        variants:
          item.variants && item.variants.length > 0
            ? {
                create: item.variants.map((v) => ({
                  name: v.name,
                  value: v.value,
                  priceAdjustment: v.priceAdjustment || 0,
                  stock: v.stock,
                  isActive: true,
                })),
              }
            : undefined,
      },
    });
    createdCount++;
  }

  const totalNow = await prisma.product.count({ where: { sellerId: seller.id } });
  console.log(`✅ Selesai! Ditambahkan: ${createdCount} produk baru, dilewati: ${skippedCount}.`);
  console.log(`🏪 Total produk aktif di toko "${seller.storeName}": ${totalNow} produk (mencakup semua 14 kategori).`);
}

main()
  .catch((err) => {
    console.error('❌ Gagal seed produk:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
