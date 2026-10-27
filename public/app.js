var globalArticles = []; 
    var currentMainCategory = '行政'; 
    var currentSubCategory = '';
    var currentGalleryData = []; 
    var currentLightboxIndex = 0;
    var imgScale = 1, imgTranslateX = 0, imgTranslateY = 0;
    var lastTouchTime = 0, touchStartDistance = 0, isPinching = false, lastTouchX = 0, lastTouchY = 0;
    var lastScrollTop = 0;
    
window.addEventListener('scroll', function() {
      // 🌟 加入這行：如果螢幕寬度大於等於 768px (電腦版/平板)，直接跳出不執行隱藏
      if (window.innerWidth >= 768) return;
      
      var st = window.pageYOffset || document.documentElement.scrollTop;
      var bottomNav = document.getElementById('bottom-nav');
      if (st > lastScrollTop && st > 60) { 
        bottomNav.classList.add('translate-y-[150%]'); 
      } else { 
        bottomNav.classList.remove('translate-y-[150%]'); 
      }
      lastScrollTop = st <= 0 ? 0 : st;
    }, false);

    

    document.addEventListener('click', function(e) {
      if (e.target.closest('#btn-start-reading')) { 
        document.getElementById('splash-screen').style.opacity = '0'; 
        setTimeout(function() { document.getElementById('splash-screen').style.display = 'none'; }, 500); 
        return; 
      }
      var navBtn = e.target.closest('.nav-btn');
      if (navBtn) {
        var targetCat = '';
        if (navBtn.id === 'nav-admin') targetCat = '行政'; 
        else if (navBtn.id === 'nav-lower') targetCat = '低年級'; 
        else if (navBtn.id === 'nav-middle') targetCat = '中年級'; 
        else if (navBtn.id === 'nav-upper') targetCat = '高年級'; 
        else if (navBtn.id === 'nav-kinder') targetCat = '星光班及幼兒園';
        if (targetCat) {
            setMainCategory(targetCat, navBtn.id); 
            // 🌟 點擊底部主分類時，自動捲動回最上方
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      var filterBtn = e.target.closest('.filter-btn'); 
      if (filterBtn) { 
          setSubCategory(filterBtn.innerText); 
          // 🌟 點擊上方子分類標籤時，也自動捲動回最上方
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return; 
      }
      
      var subCatCard = e.target.closest('.sub-cat-card'); 
      if (subCatCard) { setSubCategory(subCatCard.querySelector('.cat-name').innerText); return; }
      
      var card = e.target.closest('.article-card'); 
      if (card) { openModal(card.id.replace('article-', '')); return; }
      
      
      
      if (e.target.id === 'article-modal') { closeModal(); return; } 
      if (e.target.closest('#btn-close-modal')) closeModal(); 
    });

    

    // ==========================================
    // 新增防護罩與解析媒體
    // ==========================================
    function escapeHTML(str) {
      if (!str) return '';
      return String(str).replace(/[&<>'"]/g, function(tag) {
        var charsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return charsToReplace[tag] || tag;
      });
    }

    

    function sortSubCategories(subs) {
      var ord = (window.catMap || {})[currentMainCategory];
      if (ord && ord.length) {
        return subs.sort(function(a, b) {
          var ia = ord.indexOf(a), ib = ord.indexOf(b); ia = ia < 0 ? 999 : ia; ib = ib < 0 ? 999 : ib;
          return (ia - ib) || a.localeCompare(b, 'zh-TW', { numeric: true });
        });
      }
      var orderMap = { '校長': 1, '家長會長': 2, '教務處': 3, '學務處': 4, '總務處': 5, '輔導室': 6, '忠班': 11, '孝班': 12, '仁班': 13, '愛班': 14, '信班': 15, '義班': 16, '和班': 17, '藍鯨班': 21, '海馬班': 22, '珊瑚班': 23, '海豚班': 24, '星光班': 25 };
      return subs.sort(function(a, b) {
        var weightA = 999, weightB = 999;
        for (var key in orderMap) { if (a.indexOf(key) !== -1) weightA = orderMap[key]; }
        for (var key in orderMap) { if (b.indexOf(key) !== -1) weightB = orderMap[key]; }
        if (weightA !== weightB) return weightA - weightB; 
        return a.localeCompare(b, 'zh-TW', { numeric: true });
      });
    }

    window.onload = function() {
      // ⚠️ 記得換成你的完全公開版 API 網址！
      var API_URL = '/api/articles'; 
      var loadingEl = document.getElementById('splash-loading'); 
      if (loadingEl) loadingEl.style.display = 'flex';
      
      Promise.all([
        fetch(API_URL).then(function(res) { return res.json(); }),
        fetch('/api/articles?type=categories').then(function(res) { return res.json(); }).catch(function() { return null; })
      ]).then(function(r) {
        if (r[0] && r[0].closed) { showClosed(r[0].message); return; }
        if (!Array.isArray(r[0])) throw new Error('bad data');
        if (r[1] && r[1].map) window.catMap = r[1].map;
        initApp(r[0]);
      }).catch(function(err) { showError(err); });

      
    };

    

    

    

    

    function renderSubCategoryGrid(subs) {
      var gridContainer = document.getElementById('subcat-grid'); 
      var listContainer = document.getElementById('article-list');
      listContainer.style.display = 'none'; 
      gridContainer.style.display = 'grid'; 
      gridContainer.innerHTML = '';
      if (subs.length === 0) { 
        gridContainer.style.display = 'block'; 
        gridContainer.innerHTML = '<div class="text-center p-8 bg-white/60 rounded-3xl border border-white mt-12 shadow-sm"><p class="text-gray-500 font-bold text-lg">這個分類目前沒有內容喔！</p></div>'; 
        return; 
      }
      subs.forEach(function(sub, index) {
        var card = document.createElement('div'); 
        var colors = ['bg-morandi-taupe', 'bg-morandi-pink', 'bg-morandi-pink', 'bg-morandi-taupe'];
        card.className = 'sub-cat-card backdrop-blur-md rounded-3xl py-6 px-2 md:py-8 md:px-4 shadow-sm border border-white/30 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 active:scale-95 flex items-center justify-center text-center ' + colors[index % 4] + ' hover:opacity-90';
        card.style.position = 'relative';
        card.innerHTML = '<div class="text-center"><h3 class="cat-name text-lg md:text-2xl lg:text-3xl font-bold text-white tracking-wider md:tracking-[0.2em] drop-shadow-sm">' + escapeHTML(sub) + '</h3></div>';
        gridContainer.appendChild(card);
      });
    }

    // ---------- 媒體解析：只接受 Drive / YouTube；縮圖用小圖，大圖點開才載入 ----------
    function splitGallery(g) {
      var out = [];
      String(g || '').split(/\n+/).forEach(function(line) {
        (line.indexOf('|||') >= 0 ? [line] : line.split(',')).forEach(function(u) { u = u.trim(); if (u) out.push(u); });
      });
      return out;
    }
    function parseMediaItem(rawItem) {
      if (!rawItem || typeof rawItem !== 'string') return null;
      var parts = rawItem.split('|||'), url = parts[0].trim();
      var caption = parts.length > 1 ? escapeHTML(parts.slice(1).join(' ').trim()) : '';
      if (!url) return null;
      var yt = url.match(/youtu(?:\.be\/|be\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
      if (yt) return { type: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0&playsinline=0&fs=1', thumbUrl: 'https://img.youtube.com/vi/' + yt[1] + '/hqdefault.jpg', caption: caption };
      var dr = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{10,})/);
      if (!dr) return null;
      var base = 'https://lh3.googleusercontent.com/d/' + dr[1];
      return { type: 'image', url: base + '=w1600', midUrl: base + '=w900', thumbUrl: base + '=w400', caption: caption };
    }

    // ---------- 導覽狀態 ----------
    var NAVID = { '行政': 'nav-admin', '低年級': 'nav-lower', '中年級': 'nav-middle', '高年級': 'nav-upper', '星光班及幼兒園': 'nav-kinder' };
    var listLimit = 20, lastList = [];
    function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function dsort(l) { return l.slice().sort(function(a, b) { return String(b.publish_date || '').localeCompare(String(a.publish_date || '')); }); }
    function subsFor(mainCat) {
      var subs = [];
      globalArticles.forEach(function(a) { if (a.main_category === mainCat && a.sub_category && subs.indexOf(a.sub_category) < 0) subs.push(a.sub_category); });
      return sortSubCategories(subs);
    }
        function renderHeader() {
      var inList = !!currentSubCategory;
      document.getElementById('hb-title').textContent = inList ? currentSubCategory : currentMainCategory;
      document.getElementById('hb-back').style.display = inList ? 'flex' : 'none';
    }
    function renderTabs() {
      var container = document.getElementById('category-tabs');
      container.innerHTML = '';
      if (!currentSubCategory) { container.style.display = 'none'; return; }
      container.style.display = 'flex';
      subsFor(currentMainCategory).forEach(function(cat) {
        var btn = document.createElement('button');
        var style = (cat === currentSubCategory) ? 'bg-morandi-dark text-white shadow-md' : 'bg-white text-gray-500 border border-white/50 shadow-sm';
        btn.className = 'filter-btn whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-colors ' + style;
        btn.innerText = cat;
        container.appendChild(btn);
      });
      var act = container.querySelector('.bg-morandi-dark');
      if (act && act.scrollIntoView) act.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
    function setMainCategory(mainCat, activeNavId) {
      currentMainCategory = mainCat; currentSubCategory = ''; listLimit = 20; closeSearchUI();
      if (location.hash.indexOf('#/c/') === 0) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
      document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('text-morandi-dark', 'md:bg-white/60', 'md:bg-white/70', 'text-gray-400', 'md:hover:bg-white/40');
        if (btn.id === activeNavId) btn.classList.add('text-morandi-dark', 'md:bg-white/70');
        else btn.classList.add('text-gray-400', 'md:hover:bg-white/40');
      });
      renderHeader(); renderTabs(); renderSubCategoryGrid(subsFor(mainCat));
    }
    function setSubCategory(subCat) {
      var wasGrid = !currentSubCategory;
      currentSubCategory = subCat; listLimit = 20; closeSearchUI();
      var h = '#/c/' + encodeURIComponent(subCat);
      try { if (wasGrid) history.pushState({ view: 'list' }, '', h); else history.replaceState({ view: 'list' }, '', h); } catch (e) {}
      renderHeader(); renderTabs(); filterArticles();
    }
    function backToGrid() {
      currentSubCategory = ''; listLimit = 20; closeSearchUI();
      renderHeader(); renderTabs(); renderSubCategoryGrid(subsFor(currentMainCategory));
      window.scrollTo(0, 0);
    }
    function showClosed(msg) {
      var s = document.getElementById('splash-screen');
      s.innerHTML = '<div class="text-center px-8"><h1 class="text-3xl font-extrabold text-morandi-dark tracking-widest mb-4">香山國小數位校刊</h1><p class="text-lg text-gray-500 whitespace-pre-wrap">' + escapeHTML(msg || '敬請期待') + '</p></div>';
      s.style.display = 'flex'; s.style.opacity = '1';
    }
    function hideSplash() {
      var s = document.getElementById('splash-screen');
      setTimeout(function() { s.style.opacity = '0'; setTimeout(function() { s.style.display = 'none'; }, 500); }, 600);
    }
    /** 網址 → 畫面：#/c/班級名稱 直接進班級；#article-文章id 直接開文章（供分享連結使用） */
    function applyRoute() {
      var h = '';
      try { h = decodeURIComponent(location.hash || ''); } catch (e) { return false; }
      var m, a;
      if ((m = h.match(/^#article-(.+)$/))) {
        a = globalArticles.filter(function(x) { return String(x.id) === m[1]; })[0];
        if (!a) return false;
        try { history.replaceState(null, '', location.pathname); } catch (e) {}
        setMainCategory(a.main_category, NAVID[a.main_category] || 'nav-admin');
        setSubCategory(a.sub_category);
        openModal(a.id);
        return true;
      }
      if ((m = h.match(/^#\/c\/(.+)$/))) {
        a = globalArticles.filter(function(x) { return x.sub_category === m[1]; })[0];
        if (!a) return false;
        try { history.replaceState(null, '', location.pathname); } catch (e) {}
        setMainCategory(a.main_category, NAVID[a.main_category] || 'nav-admin');
        setSubCategory(m[1]);
        return true;
      }
      return false;
    }
    function initApp(articles) {
      articles.forEach(function(a, idx) { if (!a.id) a.id = 'auto-' + idx; });
      globalArticles = articles;
      if (!applyRoute()) setMainCategory('行政', 'nav-admin');
      hideSplash();
    }

    // ---------- 搜尋 ----------
    function closeSearchUI() { var sp = document.getElementById('sp'); if (sp) sp.style.display = 'none'; var q = document.getElementById('q'); if (q) q.value = ''; }
    function restoreView() { renderHeader(); if (currentSubCategory) filterArticles(); else renderSubCategoryGrid(subsFor(currentMainCategory)); }
    function runSearch() {
      var q = document.getElementById('q').value.trim().toLowerCase();
      if (!q) { restoreView(); return; }
      var r = globalArticles.filter(function(a) { return [a.title, a.author, a.sub_category, a.main_category, a.content].join(' ').toLowerCase().indexOf(q) >= 0; });
      listLimit = 20;
      document.getElementById('hb-title').textContent = '搜尋結果（' + r.length + '）';
      document.getElementById('category-tabs').style.display = 'none';
      renderArticles(dsort(r));
    }
    var qTimer; document.getElementById('q').addEventListener('input', function() { clearTimeout(qTimer); qTimer = setTimeout(runSearch, 200); });
    document.addEventListener('click', function(e) {
      var t = e.target.closest('#hb-back,#hb-search,#btn-more');
      if (!t) return;
      if (t.id === 'hb-back') { if (history.state && history.state.view === 'list') history.back(); else backToGrid(); }
       else if (t.id === 'hb-search') {
        var sp = document.getElementById('sp');
        if (sp.style.display === 'block') { closeSearchUI(); restoreView(); } else { sp.style.display = 'block'; document.getElementById('q').focus(); }
      } else if (t.id === 'btn-more') { listLimit += 20; renderArticles(lastList); }
    });


    function filterArticles() {
      var filtered = globalArticles.filter(function(a) { return a.main_category === currentMainCategory; });
      if (currentSubCategory) filtered = filtered.filter(function(a) { return a.sub_category === currentSubCategory; });
      
      // 渲染卡片列表
      renderArticles(dsort(filtered));

      // 🌟 修正：精準開啟「校長」或「家長會長」彈窗
      if (currentSubCategory === '校長' || currentSubCategory === '校長室' || currentSubCategory === '家長會長') {
        if (filtered && filtered.length === 1) {
          setTimeout(function() {
            var targetArticle = filtered[0];
            
            // 找出這篇文章在 globalArticles 全站陣列中的真實索引 (Index)
            var globalIndex = globalArticles.findIndex(function(a) {
              return a.title === targetArticle.title && a.sub_category === targetArticle.sub_category;
            });

            // 優先傳入 ID，若 openModal 吃 Index 則傳入 globalIndex
            if (typeof openModal === 'function') {
              if (targetArticle.id) {
                openModal(targetArticle.id);
              } else if (globalIndex !== -1) {
                openModal(globalIndex);
              } else {
                openModal(targetArticle);
              }
            }
          }, 50);
        }
      }
    }

// ==========================================
    // 2. 渲染文章列表 (靠上對齊 + 標題與作者同行)
    // ==========================================
    function renderArticles(articles) {
      var gridContainer = document.getElementById('subcat-grid'); 
      var listContainer = document.getElementById('article-list');
      if (gridContainer) gridContainer.style.display = 'none';
      lastList = articles || []; var total = lastList.length; articles = lastList.slice(0, listLimit); 
      if (listContainer) {
        listContainer.style.display = 'grid'; 
        listContainer.innerHTML = '';
      }
      if (!articles || articles.length === 0) { 
        if (listContainer) {
          listContainer.style.display = 'block'; 
          listContainer.innerHTML = '<div class="text-center p-8 bg-white/60 rounded-3xl border border-white mt-12 shadow-sm"><p class="text-gray-500 font-bold text-lg">這個分類目前沒有文章喔！</p></div>'; 
        }
        return; 
      }
      
      articles.forEach(function(article) {
        var card = document.createElement('div');
        card.className = 'article-card bg-white/80 backdrop-blur-sm rounded-[1.5rem] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 active:scale-95 flex flex-col h-full justify-between';
        card.id = 'article-' + article.id;
        
        card.onclick = function() { openModal(article.id); };
        
        var safeTitle = escapeHTML(article.title || '');
        var safeAuthor = escapeHTML(article.author || '');
        var safeSubCategory = escapeHTML(article.sub_category || article.main_category || '未分類');
        
        var mediaList = [];
        if (article.gallery) {
          var items = splitGallery(article.gallery);
          items.forEach(function(item) { 
            var parsed = parseMediaItem(item); 
            if (parsed) mediaList.push(parsed); 
          });
        }
        
        var contentHtml = '<div class="flex items-stretch gap-4 md:gap-5 flex-1">';
        
        // 左側：圖片
        if (mediaList.length > 0) {
            var m = mediaList[0]; 
            contentHtml += '<div class="relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-900">';
            if (m.thumbUrl) {
                contentHtml += '<img src="' + m.thumbUrl + '" loading="lazy" class="w-full h-full object-cover">';
            }
            if (m.type === 'youtube' || m.type === 'drive_video') {
                contentHtml += '<div class="absolute inset-0 bg-black/20 flex items-center justify-center"><div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/90 text-morandi-dark flex items-center justify-center shadow"><svg class="w-4 h-4 md:w-5 md:h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>';
            }
            if (mediaList.length > 1) {
                contentHtml += '<div class="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white text-[11px] md:text-xs font-bold px-2 py-1 rounded-full flex items-center shadow-sm">';
                contentHtml += '<svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                contentHtml += mediaList.length;
                contentHtml += '</div>';
            }
            contentHtml += '</div>';
        }
        
        // 🌟 修復處：改為 justify-start 讓內容靠上對齊
        contentHtml += '<div class="flex-1 flex flex-col justify-start min-w-0 py-1">';
        contentHtml += '<div class="mb-2"><span class="text-xs md:text-sm font-bold text-morandi-dark bg-morandi-light/80 px-3 py-1 rounded-full inline-block">' + safeSubCategory + '</span></div>';
        
        contentHtml += '<div class="text-base md:text-lg font-bold text-morandi-dark leading-snug break-words mt-0.5">';
        if (safeTitle) contentHtml += '<span>' + safeTitle + '</span>';
        if (safeAuthor) contentHtml += '<span class="inline-block text-xs md:text-sm font-bold text-gray-400"> 作者 / ' + safeAuthor + '</span>';
        contentHtml += '</div>';
        
        contentHtml += '</div>'; // 右側結束
        contentHtml += '</div>'; // 容器結束
        
        card.innerHTML = contentHtml; 
        listContainer.appendChild(card);
      });
      if (total > listLimit) {
        var more = document.createElement('div');
        more.className = 'col-span-full text-center pt-2';
        more.innerHTML = '<button id="btn-more" class="px-8 py-3 rounded-full bg-white text-morandi-dark font-bold shadow-sm">看更多（還有 ' + (total - listLimit) + ' 則）</button>';
        listContainer.appendChild(more);
      }
    }

// ==========================================
    // 3. 閱讀彈窗 (智慧判斷：依據有無內文決定版型，無內文時完美同行)
    // ==========================================
    var lockY = 0;
    function lockBody() {
      if (document.body.classList.contains('modal-open')) return;
      lockY = window.pageYOffset || 0;
      document.body.style.top = '-' + lockY + 'px';
      document.body.classList.add('modal-open');
    }
    function unlockBody() {
      if (!document.body.classList.contains('modal-open')) return;
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      window.scrollTo(0, lockY);
      var h = document.getElementById('top-header');
      if (h) { h.style.transform = 'translateZ(0)'; requestAnimationFrame(function() { h.style.transform = ''; }); }
    }
    function openModal(articleId) {
      var article = globalArticles.find(function(a) { return String(a.id) === String(articleId); }); 
      if(!article) return;
      currentArticleId = article.id;
      
      document.getElementById('modal-category').innerText = article.sub_category || article.main_category || '未分類';
      var catContainer = document.getElementById('modal-category').parentElement;
      
      var modalTitle = document.getElementById('modal-title');
      var safeTitle = escapeHTML(article.title || '');
      var safeAuthor = escapeHTML(article.author || '');
      
      if (safeTitle || safeAuthor) {
          var titleHtml = safeTitle;
          if (safeAuthor) {
              titleHtml += '<span class="text-base md:text-lg font-normal text-gray-400 ml-2"> 作者 / ' + safeAuthor + '</span>';
          }
          modalTitle.innerHTML = titleHtml;
          modalTitle.style.display = 'block';
      } else {
          modalTitle.style.display = 'none';
      }
      
      var dateStr = '';
      document.getElementById('modal-date').innerText = dateStr;
      var metaBox = document.getElementById('modal-meta-box');
      if (!dateStr) { metaBox.style.display = 'none'; } else { metaBox.style.display = 'flex'; }
      
      var safeContent = escapeHTML(article.content || '').replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '');
      var hasContent = !!safeContent;
      document.getElementById('fs-group').style.display = hasContent ? 'flex' : 'none';
      var contentEl = document.getElementById('modal-content');
      if (hasContent) {
          contentEl.innerHTML = renderParagraphs(article.content || '');
          contentEl.style.display = 'block';
      } else {
          contentEl.style.display = 'none';
      }
      
      var mediaItems = [];
      if (article.gallery) {
        var items = splitGallery(article.gallery);
        items.forEach(function(item) {
          var parsed = parseMediaItem(item);
          if (parsed) mediaItems.push(parsed);
        });
      }
      var hasGallery = mediaItems.length > 1;
      
      var modalInner = document.getElementById('modal-inner');
      var leftPanel = document.getElementById('modal-left-panel');
      var rightPanel = leftPanel.nextElementSibling;
      var mainMediaContainer = document.getElementById('modal-main-media-container');
      var gallerySection = document.getElementById('modal-gallery-container');
      var galleryContainer = document.getElementById('modal-gallery');
      
      mainMediaContainer.innerHTML = '';
      galleryContainer.innerHTML = '';
      
      // 🌟 核心版面切換邏輯
      if (!hasContent && !hasGallery && mediaItems.length > 0) {
          // 模式 A：單圖或單影片 且【無內文】 -> 上下緊湊排版
          modalInner.className = "bg-white/95 backdrop-blur-md rounded-[2rem] max-w-2xl mx-auto w-full max-h-[90vh] overflow-y-auto md:overflow-hidden relative shadow-2xl flex flex-col transition-transform duration-300 scale-95 border border-white";
          leftPanel.className = "w-full bg-gray-100 flex flex-col items-center justify-center relative overflow-hidden shrink-0";
          
          // 關鍵修復：使用 flex-row 讓容器內的「標籤」與「標題+作者」強制併成完美的一行
          rightPanel.className = "w-full text-left p-4 md:p-6 bg-white flex flex-row flex-wrap items-center";
          
          catContainer.className = "mr-3"; // 取消原本的底部間距，改為右側間距
          modalTitle.className = "text-xl md:text-2xl font-bold text-morandi-dark leading-snug";
          
          leftPanel.style.display = 'flex';
          gallerySection.style.display = 'none';
      } else {
          // 模式 B：【有內文】 或 多圖 或 無圖 -> 恢復原本的左右分欄排版
          modalInner.className = "bg-white/95 backdrop-blur-md rounded-[2rem] max-w-5xl mx-auto w-full max-h-[90vh] overflow-y-auto md:overflow-hidden relative shadow-2xl flex flex-col md:flex-row transition-transform duration-300 scale-95 border border-white";
          leftPanel.className = "w-full md:w-2/5 max-h-[35vh] md:max-h-none bg-gray-50/50 flex flex-col items-center justify-center p-4 md:p-8 border-b md:border-b-0 md:border-r border-gray-200/50 relative overflow-hidden shrink-0";
          rightPanel.className = "w-full md:w-3/5 flex flex-col p-5 md:p-10 md:overflow-y-auto min-h-0 relative flex-1 text-left";
          
          catContainer.className = "mb-2 block";
          modalTitle.className = "text-2xl md:text-3xl font-bold text-morandi-dark mb-2 leading-snug block";
          
          if (mediaItems.length > 0) leftPanel.style.display = 'flex';
          else leftPanel.style.display = 'none';
      }
      
      // 媒體渲染
      if (mediaItems.length > 0) {
          var mainItem = mediaItems[0];
          var ytMinHeight = (!hasContent && !hasGallery) ? 'md:min-h-[450px]' : 'md:min-h-[350px]';
          
          if (mainItem.type === 'youtube') {
              var ytId = mainItem.embedUrl.match(/embed\/([^?]+)/)[1];
              mainMediaContainer.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + ytId + '?rel=0" class="w-full h-full min-h-[250px] ' + ytMinHeight + ' rounded-xl shadow-md" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
          } else {
              var mainLink = document.createElement('a');
              mainLink.setAttribute('data-fancybox', 'gallery-' + article.id);
              if (mainItem.caption) mainLink.setAttribute('data-caption', mainItem.caption);
              
              if (mainItem.type === 'drive_video') {
                  mainLink.href = mainItem.embedUrl;
                  mainLink.setAttribute('data-type', 'iframe');
                  mainLink.setAttribute('data-width', '1280'); mainLink.setAttribute('data-height', '720');
              } else { mainLink.href = mainItem.url; }
              
              mainLink.className = 'group relative w-full h-full flex items-center justify-center cursor-zoom-in';
              mainLink.innerHTML = '<img src="' + (mainItem.midUrl || mainItem.thumbUrl) + '" class="w-full h-auto object-contain max-h-[35vh] md:max-h-[70vh] drop-shadow-md group-hover:scale-105 transition-transform duration-500 rounded-xl">';
              mainMediaContainer.appendChild(mainLink);
          }
          
          if (hasGallery) {
              gallerySection.style.display = 'block';
              for (var i = 1; i < mediaItems.length; i++) {
                  var m = mediaItems[i];
                  var thumbLink = document.createElement('a');
                  thumbLink.setAttribute('data-fancybox', 'gallery-' + article.id);
                  if (m.caption) thumbLink.setAttribute('data-caption', m.caption);
                  if (m.type === 'youtube') {
                      var yId = m.embedUrl.match(/embed\/([^?]+)/)[1];
                      thumbLink.href = 'https://www.youtube-nocookie.com/embed/' + yId + '?autoplay=1&rel=0';
          thumbLink.setAttribute('data-type', 'iframe'); thumbLink.setAttribute('data-width', '1280'); thumbLink.setAttribute('data-height', '720');
                  } else if (m.type === 'drive_video') {
                      thumbLink.href = m.embedUrl;
                      thumbLink.setAttribute('data-type', 'iframe');
                      thumbLink.setAttribute('data-width', '1280'); thumbLink.setAttribute('data-height', '720');
                  } else { thumbLink.href = m.url; }
                  thumbLink.className = 'relative aspect-square w-full rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all group flex items-center justify-center bg-gray-900 cursor-zoom-in';
                  var thumbHtml = '<img loading="lazy" src="' + m.thumbUrl + '" class="w-full h-full object-cover group-hover:opacity-70 transition-opacity">';
                  if (m.type === 'youtube' || m.type === 'drive_video') {
                      thumbHtml += '<div class="absolute inset-0 bg-black/30 flex items-center justify-center"><svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>';
                  }
                  thumbLink.innerHTML = thumbHtml;
                  galleryContainer.appendChild(thumbLink);
              }
          }
      } else {
          // 完全沒有任何媒體時
          if (!hasContent) {
              modalInner.className = "bg-white/95 backdrop-blur-md rounded-[2rem] max-w-2xl mx-auto w-full overflow-hidden relative shadow-2xl flex flex-col transition-transform duration-300 scale-95 border border-white text-center";
              rightPanel.className = "w-full text-center p-6 md:p-10 bg-white flex flex-row flex-wrap items-center justify-center";
              catContainer.className = "mr-3";
              modalTitle.className = "text-xl md:text-2xl font-bold text-morandi-dark leading-snug";
          }
      }
      
      var modal = document.getElementById('article-modal'); 
      modal.style.display = 'flex';
      modal.style.pointerEvents = ''; 
      lockBody();
      setTimeout(function() { 
        modal.classList.remove('opacity-0'); 
        var box = document.getElementById('modal-inner');
        if (box) box.classList.remove('scale-95');
      }, 10);
      
      history.pushState({ modalOpen: true }, "", "#article-" + articleId);
    }
    // ==========================================
    // 升級版：關閉彈窗 (結合平滑縮小動畫)
    // ==========================================
    function closeModal(isFromPopState) {
      var modal = document.getElementById('article-modal');
      modal.style.pointerEvents = 'none'; 
      var box = document.getElementById('modal-inner');
      
      modal.classList.add('opacity-0'); 
      if(box) box.classList.add('scale-95'); 
      
      setTimeout(function() { 
        modal.style.display = 'none'; 
        unlockBody(); 
        
        // 清除背景 iframe 防止影片繼續出聲
        var iframes = document.getElementsByTagName('iframe');
        for (var i = 0; i < iframes.length; i++) { iframes[i].src = ''; }
      }, 300);

      if (isFromPopState !== true && history.state && history.state.modalOpen) {
          history.back();
      }
    }

    // ==========================================
    // 監聽手機返回鍵
    // ==========================================
    window.addEventListener('popstate', function() {
        var modal = document.getElementById('article-modal');
        if (modal && modal.style.display === 'flex') { closeModal(true); return; }
        if (currentSubCategory) backToGrid();
    });
   
    // ==========================================
    // 內文段落（每段自動縮排兩字）、字級、分享、圖片載入失敗處理
    // ==========================================
    var currentArticleId = null;
    function renderParagraphs(text) {
      return String(text || '').replace(/\r\n/g, '\n').replace(/^(?:[ \t\u3000]*\n)+/, '').replace(/\s+$/, '').split('\n').map(function(line) {
        var s = line.replace(/^[\u3000 \t]+/, '');
        return s ? '<p class="para">' + escapeHTML(s) + '</p>' : '<div class="h-3"></div>';
      }).join('');
    }
    function applyFs(n) {
      n = String(n);
      document.documentElement.setAttribute('data-fs', n);
      document.querySelectorAll('.fs-btn').forEach(function(b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-fs') === n)); });
      try { localStorage.setItem('xs_fs', n); } catch (e) {}
    }
    function toastMsg(t) {
      var d = document.createElement('div');
      d.className = 'fixed left-1/2 -translate-x-1/2 bottom-24 bg-morandi-dark text-white px-5 py-2.5 rounded-full z-[200] shadow-lg';
      d.textContent = t; document.body.appendChild(d);
      setTimeout(function() { d.remove(); }, 2000);
    }
    function shareArticle() {
      if (!currentArticleId) return;
      var a = globalArticles.filter(function(x) { return String(x.id) === String(currentArticleId); })[0];
      var url = location.origin + '/s/' + encodeURIComponent(currentArticleId);
      var title = (a && (a.title || a.sub_category) ? (a.title || a.sub_category) + ' - ' : '') + '香山國小數位校刊';
      if (navigator.share) navigator.share({ title: title, url: url }).catch(function() {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function() { toastMsg('已複製連結'); });
    }
    document.addEventListener('click', function(e) {
      var b = e.target.closest('.fs-btn,#btn-modal-share');
      if (!b) return;
      if (b.id === 'btn-modal-share') shareArticle(); else applyFs(b.getAttribute('data-fs'));
    });
    document.getElementById('btn-modal-close').addEventListener('click', function() { closeModal(); });
    document.addEventListener('error', function(e) { var el = e.target; if (el && el.tagName === 'IMG') el.style.display = 'none'; }, true);
    try { applyFs(localStorage.getItem('xs_fs') || '0'); } catch (e) { applyFs('0'); }
    document.addEventListener('DOMContentLoaded', function() {
      if (window.Fancybox) Fancybox.bind('[data-fancybox]', { Thumbs: { type: 'modern' }, Hash: false });
    });


function showError(error) { document.getElementById('splash-loading').innerHTML = '<p class="text-red-500 font-bold text-center">載入失敗<br>請重新整理</p>'; }
