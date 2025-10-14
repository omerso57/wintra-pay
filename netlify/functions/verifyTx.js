const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), p), 'utf-8'));
}

const payment = loadJson('pay/data/payment.json');
const products = loadJson('pay/data/products.json');
const abi = loadJson('pay/data/wtr-abi.json');

const { Interface, utils, providers, BigNumber } = require('ethers');
const ERC20_IFACE = new Interface(abi);
const TRANSFER_TOPIC = ERC20_IFACE.getEventTopic('Transfer');

const RPC = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const provider = new providers.JsonRpcProvider(RPC);

exports.handler = async (event) => {
  try {
    const { tx, sku } = event.queryStringParameters || {};
    if (!tx) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"tx gereklidir" }) };

    const receipt = await provider.getTransactionReceipt(tx);
    if (!receipt || receipt.status !== 1) {
      return { statusCode: 200, body: JSON.stringify({ ok:false, error:"Tx bulunamadı veya başarısız" }) };
    }
    if (receipt.to?.toLowerCase() !== payment.token.toLowerCase()) {
      return { statusCode: 200, body: JSON.stringify({ ok:false, error:"Bu tx WTR sözleşmesine ait değil" }) };
    }

    const item = (products.items || []).find(i => i.sku === sku) || null;
    const priceHuman = (item && item.priceHuman) || payment.priceHuman;
    const decimals = payment.decimals || 18;
    const required = utils.parseUnits(String(priceHuman), decimals);

    let paid = BigNumber.from(0);
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== payment.token.toLowerCase()) continue;
      if (log.topics[0] !== TRANSFER_TOPIC) continue;
      const parsed = ERC20_IFACE.parseLog(log);
      if (parsed.args.to.toLowerCase() === payment.seller.toLowerCase()) {
        paid = paid.add(parsed.args.value);
      }
    }

    if (paid.gte(required)) {
      const downloadUrl = '/pay/public/downloads/wintra-sample.pdf';
      return { statusCode: 200, body: JSON.stringify({ ok:true, downloadUrl }) };
    } else {
      return { statusCode: 200, body: JSON.stringify({ ok:false, error:"Ödenen tutar yetersiz" }) };
    }

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};