// 分享連結 /s/<文章id>：給 LINE / Facebook 的爬蟲讀取標題、摘要與縮圖，一般使用者會被導向文章頁。
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async function handler(req, res) {
  const id = String(req.query.id || '').replace(/[^\w-]/g, '').slice(0, 80);
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = 'https://' + host;
  let title = '香山國小數位校刊';
  let desc = '班級與處室的校園點滴，一起來看看孩子們的精彩時刻';
  let image = origin + '/og.png';
  try {
    const r = await fetch(process.env.GAS_URL + '?api=true', { redirect: 'follow' });
    const list = await r.json();
    const a = Array.isArray(list) && list.find((x) => String(x.id) === id);
    if (a) {
      title = (a.title || a.sub_category) + ' - 香山國小數位校刊';
      const text = String(a.content || '').replace(/\s+/g, ' ').trim();
      desc = text ? text.slice(0, 90) : (a.sub_category || '') + ' 的校園點滴';
      const first = String(a.gallery || '').split('\n')[0];
      let m = first.match(/drive\.google\.com\/file\/d\/([\w-]{10,})/);
      if (m) image = 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1200';
      else if ((m = first.match(/[?&]v=([\w-]{11})/))) image = 'https://img.youtube.com/vi/' + m[1] + '/hqdefault.jpg';
    }
  } catch (e) { /* 取不到資料就用網站預設的預覽 */ }
  const url = origin + '/s/' + id;
  const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)}</title>
<meta property="og:type" content="article"><meta property="og:site_name" content="香山國小數位校刊">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=/#article-${esc(id)}"></head>
<body><a href="/#article-${esc(id)}">前往文章</a></body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
};
