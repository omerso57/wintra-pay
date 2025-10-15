/* ======================================
   Wintra - WTR Token Gerçek Ödeme Sistemi
   ====================================== */

const CONFIG = {
  chainIdHex: "0x38", // BSC Mainnet
  token: "0xf5b1160d39da31f0dcc0afa14f220da50af7dbf", // WTR kontrat adresi
  seller: "0xe8db729e3b9d1263a60304a49d5d24563488afac", // Satıcı cüzdan adresi (senin)
  priceWTR: "1000"
};

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

let provider, signer, userAddress, token, tokenDecimals;

// Kısayol fonksiyonları
const $ = (q) => document.querySelector(q);
const notify = (m) => alert(m);

async function ensureProvider() {
  if (!window.ethereum) throw new Error("MetaMask bulunamadı!");
  provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  signer = provider.getSigner();
}

async function switchToBSC() {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONFIG.chainIdHex }]
    });
  } catch (err) {
    if (err.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CONFIG.chainIdHex,
            chainName: "Binance Smart Chain",
            rpcUrls: ["https://bsc-dataseed.binance.org/"],
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            blockExplorerUrls: ["https://bscscan.com"]
          }
        ]
      });
    } else throw err;
  }
}

async function connectWallet() {
  await ensureProvider();
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  userAddress = ethers.utils.getAddress(accounts[0]);

  await switchToBSC();

  token = new ethers.Contract(CONFIG.token, ERC20_ABI, signer);
  tokenDecimals = await token.decimals();

  const btn = $("#btn-connect");
  if (btn) {
    btn.textContent = "Cüzdan Bağlı";
    btn.disabled = true;
  }

  renderBuyUI();
  notify("Cüzdan bağlandı ve BSC (56) ağı seçildi.");
}

function renderBuyUI() {
  const box = $("#products");
  if (!box) return;
  box.innerHTML = `
    <div class="sku">
      <div><div class="muted">Ürün</div><strong>Gölgelerin Ötesinde</strong></div>
      <div><div class="muted">Fiyat</div><strong>${CONFIG.priceWTR} WTR</strong></div>
    </div>
    <div style="margin-top:12px">
      <button id="btn-buy">1000 WTR ile Öde</button>
    </div>
  `;
  $("#btn-buy").addEventListener("click", buyNow);
}

async function buyNow() {
  try {
    if (!signer) await connectWallet();

    const amount = ethers.utils.parseUnits(CONFIG.priceWTR, tokenDecimals);

    const balance = await token.balanceOf(userAddress);
    if (balance.lt(amount)) return notify("Yetersiz WTR bakiyesi!");

    const tx = await token.transfer(CONFIG.seller, amount);
    notify("Ödeme gönderildi. Onay bekleniyor...");

    const receipt = await tx.wait(1);
    if (receipt.status === 1) {
      notify("✅ Ödeme başarılı! İndirme başlatılıyor...");
      // window.location.href = "../public/downloads/tesekkurler.html";
    } else notify("⚠️ İşlem başarısız!");
  } catch (err) {
    notify("Ödeme hatası: " + (err.message || err));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const connectBtn = $("#btn-connect");
  if (connectBtn) connectBtn.addEventListener("click", connectWallet);
});
