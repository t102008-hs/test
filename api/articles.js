// 前台資料代理：前台只打這支，Google Apps Script 網址不再出現在網頁裡；
// 並由 Vercel 邊緣網路快取 5 分鐘，大量家長同時開啟也不會壓垮 Apps Script。
module.exports = async function handler(req, res) {
  const base = process.env.GAS_URL;
  if (!base) { res.setHeader('Cache-Control', 'no-store'); res.status(500).json({ error: 'GAS_URL is not set' }); return; }
  const type = req.query.type === 'categories' ? 'categories' : 'true';
  try {
    const r = await fetch(base + '?api=' + type, { redirect: 'follow' });
    const text = await r.text();
    JSON.parse(text); // 確認拿到的是 JSON，不是 Google 的登入頁或錯誤頁
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(text);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'upstream' });
  }
};
