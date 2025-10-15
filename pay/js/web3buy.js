/* =========================
   Wintra - WTR Ödeme (BSC)
   ========================= */

const RAW_CONFIG = {
  chainIdHex: '0x38', // BSC Mainnet
  token: '0xf5B1160d39dA31f0DCC0AfA14f220dA50Af7dbf',   // WTR kontratı
  seller: '0xe8db729E3B9D1263A60304A49D5d24563488aFac', // Ödemelerin gideceği cüzdan
  priceWTR: '1000',
};

// --- Adresleri sanitize et (trim + checksum). Hata varsa burada yakalarız.
let CONFIG;
try {
  CONFIG = {
    chainIdHex: RAW_CONFIG.chainIdHex,
    token: ethers.utils.getAddress(RAW_CONFIG.token.trim()),
    seller: ethers.utils.getAddress(RAW_CONFIG.seller.trim()),
    priceWTR: RAW_CONFIG.priceWTR.trim(),
  };
} catch (e) {
  alert('Adres biçimi hatalı: ' + (e?.message || e));
  throw e;
}

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

let provider, signer, userAddress, token, tokenDecimals;

function $(s){ return document.querySelector(s); }
function notify(m){ alert(m); }

async function ensureProvider(){
  if(!window.ethereum) throw new Error('MetaMask bulunamadı.');
  provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  signer = provider.getSigner();
}

async function switchToBSC(){
  try {
    await ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId: CONFIG.chainIdHex }] });
  } catch (err) {
    if (err.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CONFIG.chainIdHex,
          chainName: 'Binance Smart Chain',
          rpcUrls: ['https://bsc-dataseed.binance.org/'],
          nativeCurrency: { name:'BNB', symbol:'BNB', decimals:18 },
          blockExplorerUrls: ['https://bscscan.com'],
        }]
      });
    } else {
      throw err;
    }
  }
}

async function connectWallet(){
  await ensureProvider();
  const accounts = await ethereum.request({ method:'eth_requestAccounts' });
  userAddress = ethers.utils.getAddress(accounts[0]);

  await switchToBSC();

  // Token kontratını oluştur
  token = new ethers.Contract(CONFIG.token, ERC20_ABI, signer);
  tokenDecimals = await token.decimals();

  // UI
  const btn = $('#btn-connect');
  if (btn) { btn.textContent = 'Cüzdan Bağlı'; btn.disabled = true; }

  renderBuyUI();
  notify('Cüzdan bağlandı ve BSC (56) ağı seçildi.');
}

function renderBuyUI(){
  const holder = $('#products');
  if (!holder) return;
  holder.innerHTML = `
    <div class="sku">
      <div>
        <div class="muted">Ürün</div>
        <strong>Gölgelerin Ötesinde</strong>
      </div>
      <div>
        <div class="muted">Fiyat</div>
        <strong>${CONFIG.priceWTR} WTR</strong>
      </div>
    </div>
    <div style="margin-top:12px">
      <button id="btn-buy">1000 WTR ile Öde</button>
    </div>
  `;
  const buyBtn = $('#btn-buy');
  buyBtn?.addEventListener('click', buyNow);
}

async function buyNow(){
  try {
    if (!signer) await connectWallet();

    // Tutarı hazırlama
    const amount = ethers.utils.parseUnits(CONFIG.priceWTR, tokenDecimals);

    // Bakiye kontrolü
    const bal = await token.balanceOf(userAddress);
    if (bal.lt(amount)) {
      return notify('Yetersiz WTR bakiyesi.');
    }

    // TRANSFER: alıcı kesinlikle satıcı adresi (token adresi DEĞİL!)
    const tx = await token.transfer(CONFIG.seller, amount);
    notify('Ödeme gönderildi. Onay bekleniyor…');

    const rec = await tx.wait(1);
    if (rec && rec.status === 1) {
      notify('Ödeme başarılı! İndirme açılıyor.');
      // window.location.href = '../public/downloads/tesekkurler.html';
    } else {
      notify('İşlem başarısız görünüyor.');
    }
  } catch (err) {
    notify('Ödeme hatası: ' + (err?.message || err));
  }
}

// Sayfa açılış bağlama
document.addEventListener('DOMContentLoaded', () => {
  const priceEl = $('#price');
  if (priceEl) priceEl.textContent = CONFIG.priceWTR;

  const c = $('#btn-connect');
  if (c && !c.getAttribute('data-wtr-bound')){
    c.setAttribute('data-wtr-bound','1');
    c.addEventListener('click', connectWallet);
  }

  // Cüzdan zaten bağlıysa butonu çiz
  if (window.ethereum && ethereum.selectedAddress) {
    renderBuyUI();
  }
});
