(() => {
  const { T, D, $, $$ } = window.PF, lab = $('.lab'); if (!lab) return;
  const tabs = $$('[role=tab]', lab), panes = $$('.bench', lab);
  const pick = i => { tabs.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1 }); panes.forEach((p, j) => p.hidden = i !== j) };
  tabs.forEach((t, i) => { t.onclick = () => pick(i); t.onkeydown = e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { const k = (i + d + tabs.length) % tabs.length; pick(k); tabs[k].focus() } } });
  const el = (h) => { const t = D.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild };
  const startBtn = (txt, fn) => { const b = el(`<button class="btn">${txt}</button>`); b.onclick = fn; return b };
  const bars = (rows, text) => {
    const max = Math.max(...rows.map(r => r[1]));
    const n = el(`<div class="res" role="status">${rows.map((r, i) => `<div class="row"><span><em style="font-style:normal">${r[0]}</em><b>${r[2]}</b></span><div class="bar ${i ? 'alt' : ''}" data-w="${r[1] / max * 100}"></div></div>`).join('')}<p>${text}</p></div>`);
    setTimeout(() => $$('.bar', n).forEach(b => b.style.width = b.dataset.w + '%'), 40); return n;
  };
  const runs = [];

  /* 1. target size */
  {
    const a = $('#fitts'); let times, i, t0, seq;
    const idle = () => { a.replaceChildren(startBtn(T('Start: hit 10 targets', 'Bắt đầu: bấm 10 mục tiêu'), go)) };
    function go() { times = { s: [], l: [] }; i = 0; seq = ['s', 'l', 's', 'l', 'l', 's', 'l', 's', 's', 'l']; next(); }
    let last = [.5, .5];
    function next() {
      if (i >= seq.length) return done();
      const k = seq[i], d = k === 's' ? 24 : 76; let p, n = 0;
      do { p = [.1 + Math.random() * .8, .14 + Math.random() * .72]; n++ } while (n < 40 && Math.abs(Math.hypot(p[0] - last[0], (p[1] - last[1]) * .6) - .42) > .1);
      last = p;
      const b = el(`<button class="tgt" aria-label="${T('Target', 'Mục tiêu')} ${i + 1}" style="width:${d}px;height:${d}px;left:${p[0] * 100}%;top:${p[1] * 100}%"></button>`);
      b.onpointerdown = e => { e.preventDefault(); hit(k) }; b.onclick = e => { if (e.detail === 0) hit(k) };
      a.replaceChildren(b); t0 = performance.now();
    }
    function hit(k) { if (i > 0) times[k].push(performance.now() - t0); i++; next() }
    const avg = x => Math.round(x.reduce((m, n) => m + n, 0) / x.length);
    function done() {
      const s = avg(times.s), l = avg(times.l), pc = Math.round((s / l - 1) * 100);
      const tx = pc > 3 ? T(`The small target cost you ${pc}% more time.`, `Mục tiêu nhỏ khiến bạn mất thêm ${pc}% thời gian.`) : T('You were just as quick on the small one. Try it again with your thumb, on a phone, in the sun.', 'Bạn bấm mục tiêu nhỏ cũng nhanh như vậy. Thử lại bằng ngón cái, trên điện thoại, ngoài nắng.');
      const n = bars([[T('Large, 76 px', 'Lớn, 76 px'), l, l + ' ms'], [T('Small, 24 px', 'Nhỏ, 24 px'), s, s + ' ms']], tx);
      n.append(startBtn(T('Run it again', 'Làm lại'), go)); a.replaceChildren(n);
    }
    runs.push(idle);
  }

  /* 2. grouping */
  {
    const a = $('#hick');
    const G = () => [
      [T('Play', 'Chơi'), [T('Enter score', 'Nhập điểm'), T('Book tee time', 'Đặt giờ chơi'), T('Yard book', 'Sổ đường bóng'), T('Tournaments', 'Giải đấu')]],
      [T('Look up', 'Tra cứu'), [T('Handicap lookup', 'Tra handicap'), T('Courses', 'Sân golf'), T('Rules', 'Luật chơi'), T('Leaderboard', 'Xếp hạng')]],
      [T('People', 'Mọi người'), [T('Clubs', 'Câu lạc bộ'), T('Friends', 'Bạn chơi'), T('Invitations', 'Lời mời'), T('Markers', 'Người xác nhận')]],
      [T('Account', 'Tài khoản'), [T('Score history', 'Lịch sử điểm'), T('Member card', 'Thẻ hội viên'), T('Language', 'Ngôn ngữ'), T('Fees', 'Phí thường niên')]]];
    const idle = () => a.replaceChildren(startBtn(T('Start: find one item, twice', 'Bắt đầu: tìm một mục, hai lần'), go));
    const shuf = x => x.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(v => v[1]);
    function round(kind, target) {
      return new Promise(res => {
        const g = G(), w = el('<div style="display:contents"></div>');
        const q = el(`<p class="ask" role="status">${T('Find', 'Tìm')} “${target}”</p>`);
        const btn = n => { const b = el(`<button>${n}</button>`); b.onclick = () => n === target ? res(performance.now() - t0) : b.classList.add('no'); return b };
        const m = el(`<div class="menu ${kind}"></div>`);
        if (kind === 'flat') shuf(g.flatMap(x => x[1])).forEach(n => m.append(btn(n)));
        else g.forEach(([h, it]) => { const c = el(`<div class="gp"><b>${h}</b></div>`); it.forEach(n => c.append(btn(n))); m.append(c) });
        w.append(q, m); a.replaceChildren(w); const t0 = performance.now();
      });
    }
    async function go() {
      const g = G(), t1 = g[1][1][0], t2 = g[3][1][0];
      const f = Math.round(await round('flat', t1)); const p = Math.round(await round('grp', t2));
      const tx = p < f ? T(`Grouping saved you ${((f - p) / 1000).toFixed(1)} seconds on one search.`, `Nhóm lại giúp bạn nhanh hơn ${((f - p) / 1000).toFixed(1)} giây cho một lần tìm.`) : T('You beat the shuffled list this time. Luck of the position: one person, one try.', 'Lần này bạn thắng danh sách xáo trộn. Do vị trí may mắn: một người, một lần thử.');
      const n = bars([[T('Grouped', 'Chia nhóm'), p, (p / 1000).toFixed(1) + ' s'], [T('Shuffled list', 'Danh sách xáo trộn'), f, (f / 1000).toFixed(1) + ' s']], tx);
      n.append(startBtn(T('Run it again', 'Làm lại'), go)); a.replaceChildren(n);
    }
    runs.push(idle);
  }

  /* 3. waiting */
  {
    const a = $('#wait'), MS = 2600;
    const card = c => el(`<div class="card ${c}"><div class="im"></div><div class="ln" style="width:70%"></div><div class="ln" style="width:92%"></div></div>`);
    const full = () => { const c = card('done'); $$('.ln', c).forEach(x => x.remove()); c.append(el(`<p style="font-weight:650">${T('A kiln keeper in Mang Thít', 'Người giữ lò ở Mang Thít')}</p>`)); return c };
    const pause = ms => new Promise(r => setTimeout(r, ms));
    const idle = () => a.replaceChildren(startBtn(T('Start: two short waits', 'Bắt đầu: hai lần chờ ngắn'), go));
    async function go() {
      const c1 = el('<div class="card"></div>'); a.replaceChildren(c1); await pause(MS); a.replaceChildren(full()); await pause(900);
      a.replaceChildren(el(`<p style="font-weight:650;font-size:var(--h3)">${T('Now the second one', 'Giờ tới lần thứ hai')}</p>`)); await pause(1100);
      a.replaceChildren(card('sk')); await pause(MS); a.replaceChildren(full()); await pause(900);
      const w = el(`<div class="res" style="justify-items:center;text-align:center"><p>${T('Which wait felt shorter?', 'Lần chờ nào thấy ngắn hơn?')}</p><div class="vote"></div></div>`);
      [T('The first', 'Lần đầu'), T('The second', 'Lần sau'), T('The same', 'Như nhau')].forEach((n, i) => { const b = startBtn(n, () => end(i)); if (i === 2) b.classList.add('ghost'); $('.vote', w).append(b) });
      a.replaceChildren(w);
    }
    function end(i) {
      const s = (MS / 1000).toFixed(1);
      const tx = i === 1 ? T(`Both took exactly ${s} seconds. The second one told you something was coming.`, `Cả hai đều đúng ${s} giây. Lần sau cho bạn biết có gì đó đang tới.`) : i === 2 ? T(`Good eye: both took exactly ${s} seconds.`, `Bạn tinh thật: cả hai đều đúng ${s} giây.`) : T(`Both took exactly ${s} seconds. Most loading advice would bet on the second, and you just proved why I test.`, `Cả hai đều đúng ${s} giây. Sách vở thường nghiêng về lần sau, và bạn vừa cho thấy vì sao phải thử.`);
      const n = bars([[T('Blank, then content', 'Trống, rồi hiện nội dung'), 1, s + ' s'], [T('Skeleton, then content', 'Khung xương, rồi hiện nội dung'), 1, s + ' s']], tx);
      n.append(startBtn(T('Run it again', 'Làm lại'), go)); a.replaceChildren(n);
    }
    runs.push(idle);
  }

  /* 4. states */
  {
    const body = $('#st-body'), bt = $$('#st-chips button');
    const rows = () => [['Yangon Golf Club', T('24 Aug, 18 holes', '24/8, 18 hố'), '83', T('Verified', 'Đã xác nhận'), ''], ['Pun Hlaing Golf Club', T('17 Aug, 18 holes', '17/8, 18 hố'), '86', T('Waiting 3 days', 'Chờ 3 ngày'), 'w'], ['City Golf Resort', T('9 Aug, 9 holes', '9/8, 9 hố'), '41', T('Verified', 'Đã xác nhận'), '']];
    const list = r => r.map(x => `<div class="rw"><span>${x[0]}</span><b>${x[2]}</b><small>${x[1]}</small><em class="${x[4]}">${x[3]}</em></div>`).join('');
    const sk = '<div class="rw s"><span>Yangon Golf</span><b>83</b><small>24 Aug</small><em>Verified</em></div>'.repeat(4);
    const mid = (b, p, c) => `<div class="mid"><b>${b}</b><span>${p}</span>${c ? `<button data-go="ok">${c}</button>` : ''}</div>`;
    const S = {
      ok: () => list(rows()), load: () => sk,
      empty: () => mid(T('No rounds yet', 'Chưa có vòng nào'), T('Enter your first scorecard and your index starts here.', 'Nhập thẻ điểm đầu tiên để bắt đầu có chỉ số.'), T('Enter a score', 'Nhập điểm')),
      err: () => mid(T('Rounds did not load', 'Chưa tải được vòng chơi'), T('The server took too long. Your saved rounds are safe.', 'Máy chủ phản hồi quá lâu. Các vòng đã lưu vẫn an toàn.'), T('Try again', 'Thử lại')),
      off: () => `<p class="off">${T('You are offline. Showing rounds from 08:40 this morning.', 'Bạn đang ngoại tuyến. Đây là dữ liệu lúc 08:40 sáng nay.')}</p>` + list(rows().slice(0, 2)),
      lock: () => mid(T('History is for Premium golfers', 'Lịch sử dành cho hội viên Premium'), T('Your rounds are kept. Upgrade to see them and get an index.', 'Các vòng của bạn vẫn được lưu. Nâng cấp để xem và có chỉ số.'), T('See Premium', 'Xem Premium'))
    };
    let cur = 'ok', tm;
    const show = k => { clearTimeout(tm); cur = k; body.innerHTML = S[k](); bt.forEach(b => b.setAttribute('aria-pressed', b.dataset.s === k)); $$('[data-go]', body).forEach(b => b.onclick = () => { show('load'); tm = setTimeout(() => show('ok'), 1100) }) };
    bt.forEach(b => b.onclick = () => show(b.dataset.s));
    runs.push(() => show(cur));
  }
  const reset = () => runs.forEach(f => f()); reset(); D.addEventListener('lang', reset);
})();
