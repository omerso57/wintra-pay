// pay/js/web3buy.js
// Ethers UMD gerekiyor: <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>

(async () => {
  const BASE = '/pay'; // sayfalar /pay altında
  const cfg = await (await fetch(`${BASE}/data/payment.json`)).json();         // chainId, token, seller, priceHuman, symbol, decimals
  const abi = await (await fetch(`${BASE}/data/wtr-abi.json`)).json();         // minimal ERC20 ABI
  const products = await (await fetch(`${BASE}/data/products.json`)).json();   // {items:[{sku,name,priceHuman}]}

  // Fiyat yaz
  document.getElementById('price')?.replaceChildren(document.createTextNode(cfg.priceHuman));

  // Ürünleri bas
  const list = document.getElementById('products');
  if (list) {
    list.innerHTML = (products.items||[]).map(p => `
      <div class="sku" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed #184b63">
        <div><strong>${p.name}</strong><div style="opacity:.8">SKU: ${p.sku}</div></div>
        <button data-buy-wtr data-sku="${p.sku}" style="background:#14a1c0;border-radius:10px;padding:8px 12px;border:0;font-weight:700;cursor:pointer">
          ${p.priceHuman||cfg.priceHuman} ${cfg.symbol} ile Al
        </button>
      </div>
    `).join('');
  }

  function needEth(){ if(!window.ethereum) throw new Error('MetaMask bulunamadı'); }

  async function ensureBsc(provider){
    const net = await provider.getNetwork();
    if (net.chainId === cfg.chainId) return;
    try {
      await ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId:'0x'+cfg.chainId.toString(16) }] });
    } catch (e) {
      if (e.code === 4902) {
        await ethereum.request({ method:'wallet_addEthereumChain', params:[{
          chainId:'0x38', chainName:'Binance Smart Chain',
          rpcUrls:['https://bsc-dataseed.binance.org/'],
          nativeCurrency:{ name:'BNB', symbol:'BNB', decimals:18 },
          blockExplorerUrls:['https://bscscan.com']
        }]} );
      } else { throw e; }
    }
  }

  async function buy(sku, btn){
    try{
      btn.disabled = true; btn.textContent = 'İşlem bekleniyor...';
      needEth();
      await ethereum.request({ method:'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await ensureBsc(provider);

      const signer = provider.getSigner();
      const user = await signer.getAddress();

      const erc20 = new ethers.Contract(cfg.token, abi, signer);
      let decimals = cfg.decimals || 18;
      try { decimals = await erc20.decimals(); } catch {}

      const item = (products.items||[]).find(i=>i.sku===sku);
      const priceHuman = (item && item.priceHuman) || cfg.priceHuman;
      const amount = ethers.utils.parseUnits(String(priceHuman), decimals);

      const bal = await erc20.balanceOf(user);
      if (bal.lt(amount)) throw new Error(`Cüzdanda yeterli ${cfg.symbol} yok. Gerekli: ${priceHuman} ${cfg.symbol}`);

      const tx = await erc20.transfer(cfg.seller, amount);
      await tx.wait(1); // 1 onay
      // thanks.html'e tx ve sku ile git
      const u = new URL(`${BASE}/thanks.html`, location.origin);
      u.searchParams.set('tx', tx.hash);
      if (sku) u.searchParams.set('sku', sku);
      location.href = u.toString();
    } catch (e){
      alert(e.message || String(e));
      btn.disabled = false;
      btn.textContent = `${cfg.priceHuman} ${cfg.symbol} ile Al`;
    }
  }

  // Cüzdan bağla butonu
  document.getElementById('btn-connect')?.addEventListener('click', async ()=>{
    try{
      needEth();
      await ethereum.request({ method:'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await ensureBsc(provider);
      alert('Cüzdan bağlandı ve BSC (56) ağına geçildi.');
    }catch(e){ alert('Bağlantı hatası: ' + (e.message||String(e))); }
  });

  // Satın alma
  document.body.addEventListener('click', (ev)=>{
    const t = ev.target.closest('[data-buy-wtr]'); if(!t) return;
    buy(t.getAttribute('data-sku'), t);
  });
})();
