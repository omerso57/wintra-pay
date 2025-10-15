/* =========================
   Wintra - WTR Ödeme (BSC)
   ========================= */

const CONFIG = {
  chainIdHex: '0x38', // BSC Mainnet
  token: '0xf5B1160d39dA31f0DCC0AfA14f220dA50Af7dbf',   // WTR
  seller: '0xe8db729E3B9D1263A60304A49D5d24563488aFac', // Satıcı cüzdanı
  priceWTR: '1000', // ürün başına WTR
};

// Minimal ERC-20 ABI
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

let provider, signer, userAddress, token, tokenDecimals;

function $(sel){ return document.querySelector(sel); }
function notify(msg){ alert(msg); }

async function ensureProvider(){
  if(!window.ethereum) throw new Error('MetaMask bulunamadı.');
  provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  signer = provider.getSigner();
  return provider;
}

async function switchToBSC(){
  try{
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CONFIG.chainIdHex }] });
  }catch(err){
    // chain ekli değilse ekleyelim
    if(err.code === 4902){
      await ethereum.request({
        method:'wallet_addEthereumChain',
        params:[{
          chainId: CONFIG.chainIdHex,
          chainName:'Binance Smart Chain',
          rpcUrls:['https://bsc-dataseed.binance.org/'],
          nativeCurrency:{ name:'BNB', symbol:'BNB', decimals:18 },
          blockExplorerUrls:['https://bscscan.com']
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

  token = new ethers.Contract(CONFIG.token, ERC20_ABI, signer);
  tokenDecimals = await token.decimals();

  // UI güncelle
  const btn = $('#btn-connect');
  if(btn){ btn.textContent = 'Cüzdan Bağlı'; btn.disabled = true; }

  // Satın alma butonunu render et
  renderBuyUI();
  notify('Cüzdan bağlandı ve BSC (56) seçildi.');
}

function renderBuyUI(){
  const holder = $('#products');
  if(!holder) return;
  const price = CONFIG.priceWTR;

  holder.innerHTML = `
    <div class="sku">
      <div>
        <div class="muted">Ürün</div>
        <strong>Gölgelerin Ötesinde</strong>
      </div>
      <div>
        <div class="muted">Fiyat</div>
        <strong>${price} WTR</strong>
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
  try{
    if(!signer) await connectWallet(); // emin ol
    const amount = ethers.utils.parseUnits(CONFIG.priceWTR, tokenDecimals);

    // Bakiye kontrolü
    const bal = await token.balanceOf(userAddress);
    if(bal.lt(amount)){
      return notify('Yetersiz WTR bakiyesi.');
    }

    // Transfer
    const tx = await token.transfer(CONFIG.seller, amount);
    notify('Ödeme gönderildi. Onay bekleniyor…');
    const rec = await tx.wait(1); // 1 blok onayı
    // Basit doğrulama
    if(rec && rec.status === 1){
      notify('Ödeme başarılı! İndirme açılıyor.');
      // İndirme/teşekkür linkini burada aç
      // window.location.href = '../public/downloads/tesekkurler.html';
    }else{
      notify('İşlem başarısız görünüyor.');
    }
  }catch(err){
    notify('Ödeme hatası: ' + (err?.message || err));
  }
}

// Sayfa yüklenince küçük UI ayarları
document.addEventListener('DOMContentLoaded', () => {
  const priceEl = $('#price');
  if(priceEl) priceEl.textContent = CONFIG.priceWTR;

  // Connect butonunu bağla
  const c = $('#btn-connect');
  if(c && !c.getAttribute('data-wtr-bound')){
    c.setAttribute('data-wtr-bound','1');
    c.addEventListener('click', connectWallet);
  }
});
