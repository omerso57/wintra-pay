(function(){
  const out = document.getElementById('out');
  function log(...a){ out.textContent += '\n' + a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); }
  function clear(){ out.textContent = 'Hazır...'; }
  document.getElementById('btn-detect').addEventListener('click', ()=>{
    clear();
    if (window.ethereum){
      log('✅ window.ethereum VAR');
      log('provider:', { isMetaMask: !!ethereum.isMetaMask });
    } else {
      log('❌ window.ethereum YOK — Tarayıcı MetaMask\'ı göremiyor.');
      log('Çözüm: Chrome/Brave kullanın ya da mobil MetaMask tarayıcısından açın.');
    }
  });
  document.getElementById('btn-connect').addEventListener('click', async ()=>{
    clear();
    if (!window.ethereum){ log('❌ ethereum yok'); return; }
    try{
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      log('✅ Bağlandı', accounts);
    }catch(e){
      log('❌ Bağlantı hatası:', e.message || String(e));
    }
  });
  document.getElementById('btn-switch').addEventListener('click', async ()=>{
    clear();
    if (!window.ethereum){ log('❌ ethereum yok'); return; }
    try{
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
      log('✅ BSC (56) ağına geçildi');
    }catch(e){
      if (e.code===4902){
        try{
          await ethereum.request({ method:'wallet_addEthereumChain', params:[{
            chainId:'0x38',
            chainName:'Binance Smart Chain',
            rpcUrls:['https://bsc-dataseed.binance.org/'],
            nativeCurrency:{ name:'BNB', symbol:'BNB', decimals:18 },
            blockExplorerUrls:['https://bscscan.com']
          }]});
          log('✅ BSC eklendi ve geçildi');
        }catch(e2){
          log('❌ Ağ ekleme hatası:', e2.message||String(e2));
        }
      }else{
        log('❌ Ağ geçiş hatası:', e.message||String(e));
      }
    }
  });
})();