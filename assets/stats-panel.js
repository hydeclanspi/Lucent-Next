/* Dependency-free, linked SVG views of aggregate buckets. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', names = { hour: '小时', day: '天', month: '月', year: '年' };
  function element(tag, cls, text) { var node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; }
  function svgNode(tag, attrs, text) { var node = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); }); if (text != null) node.textContent = text; return node; }
  function mount(container, options) {
    var store = options.store, range = '7d', parentRange = '7d', source = 'drag', view, selected = -1, selectedBin = null, activeChart = null, destroyed = false, frame = null;
    var sources = { drag: '浮光拖动', keyboard: '键盘拨动', manual: '手动调节', add: '添加浮光' };
    var root = element('div', 'stats-panel'); container.appendChild(root);
    var header = element('div', 'stats-header'), heading = element('div'), title = element('h3', 'stats-title', '历史统计');
    heading.appendChild(title); heading.appendChild(element('p', 'stats-subtitle', '代号：交互 · 本机统计'));
    var back = element('button', 'btn sm stats-back', '返回'); back.type = 'button'; back.addEventListener('click', options.onBack);
    header.appendChild(heading); header.appendChild(back); root.appendChild(header);
    var toolbar = element('div', 'stats-toolbar'), ranges = element('div', 'stats-ranges'); ranges.setAttribute('role', 'group'); ranges.setAttribute('aria-label', '统计时间范围');
    [['today', '今天'], ['7d', '7 天'], ['30d', '30 天'], ['1y', '1 年'], ['all', '全部']].forEach(function (item) {
      var button = element('button', 'stats-range', item[1]); button.type = 'button'; button.dataset.range = item[0];
      button.addEventListener('click', function () { range = item[0]; selected = -1; selectedBin = null; activeChart = null; render(); }); ranges.appendChild(button);
    });
    toolbar.appendChild(ranges);
    var zoomOut = element('button', 'stats-range stats-zoom-out', '返回全段'); zoomOut.type = 'button'; zoomOut.hidden = true;
    zoomOut.addEventListener('click', function () { range = parentRange; selected = -1; activeChart = null; render(); }); toolbar.appendChild(zoomOut); root.appendChild(toolbar);
    var meta = element('p', 'stats-meta'), status = element('div', 'stats-status'); status.setAttribute('role', 'status');
    var statusText = element('span'), retry = element('button', 'stats-retry', '重试'); retry.type = 'button'; retry.addEventListener('click', function () { store.retry(); });
    status.appendChild(statusText); status.appendChild(retry); root.appendChild(meta); root.appendChild(status);
    // Wide sheets pair the marks two per row; narrow sheets fall back to one column.
    var columns = element('div', 'stats-columns'); root.appendChild(columns);
    function makeChart(title, note, kind) {
      var section = element('section', 'stats-section stats-' + kind), head = element('div', 'stats-chart-heading');
      var h = element('h4', '', title); head.appendChild(h); section.appendChild(head);
      var caption = element('p', 'stats-caption', note); section.appendChild(caption);
      var host = element('div', 'stats-chart'); host.dataset.chart = kind; section.appendChild(host); columns.appendChild(section);
      return { section: section, head: head, host: host, kind: kind, caption: caption };
    }
    var probability = makeChart('Light 倾向', '每个时段内，主动调节后的平均概率', 'probability');
    var activity = makeChart('交互次数', '一次完整操作计一次，自然游动不计入', 'activity');
    var selector = element('select', 'stats-source'); selector.setAttribute('aria-label', '交互行为类型');
    Object.keys(sources).forEach(function (key) { var opt = element('option', '', sources[key]); opt.value = key; selector.appendChild(opt); });
    selector.addEventListener('change', function () { source = selector.value; render(); }); activity.head.appendChild(selector);
    var heat = makeChart('概率分布', '颜色越深，该时段落在此概率区间的占比越高', 'heat');
    var legend = element('div', 'stats-heat-legend'); legend.appendChild(element('span', '', '少')); legend.appendChild(element('i')); legend.appendChild(element('span', '', '多')); heat.head.appendChild(legend);
    // 第四格来自场志：碰撞力度的分布（没有场志时不占位；力度是累计值，不随时段变化）。
    var impacts = options.field ? makeChart('碰撞力度', '碰撞瞬间两枚的相对速度：自然碰撞、FSD 冲撞与手拨推挤', 'impacts') : null;
    var impactsNote = null;
    if (impacts) { impactsNote = element('span', 'stats-impacts-note', ''); impactsNote.hidden = true; impacts.head.appendChild(impactsNote); }
    // 碰撞力度也能点选：按住某一档看它的详情。
    var impactsSel = -1;
    // 地形图同样可点选；terrainGeo 由绘图时写入，供命中判定用。
    var terrainSel = null, terrainGeo = null;
    function terrainCode(col, row) { return String.fromCharCode(65 + col) + (row ? row + 1 : ''); }
    var detail = element('div', 'stats-detail'); detail.setAttribute('aria-live', 'polite'); detail.setAttribute('aria-atomic', 'true');
    var detailTime = element('strong'), detailValues = element('p'), detailExtra = element('p', 'stats-detail-extra');
    var zoom = element('button', 'stats-zoom', '展开此时段'); zoom.type = 'button';
    zoom.addEventListener('click', function () {
      var b = view.buckets[selected]; if (!b) return;
      if (typeof range === 'string') parentRange = range;
      range = { start: b.start, end: b.end }; selected = -1; activeChart = null; selectedBin = null; render();
      probability.host.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
    var detailHead = element('div', 'stats-detail-head'); detailHead.appendChild(detailTime); detailHead.appendChild(zoom);
    detail.appendChild(detailHead); detail.appendChild(detailValues); detail.appendChild(detailExtra); root.appendChild(detail);
    var navigation = element('div', 'stats-navigation'), previous = element('button', 'stats-step', '上一时段'), next = element('button', 'stats-step', '下一时段');
    previous.type = next.type = 'button';
    function step(direction) { selected = Math.max(0, Math.min(view.buckets.length - 1, selected + direction)); selectedBin = null; draw(); }
    previous.addEventListener('click', function () { step(-1); }); next.addEventListener('click', function () { step(1); });
    navigation.appendChild(previous); navigation.appendChild(element('span', 'stats-touch-hint', '轻点图表，或横向滑动查看')); navigation.appendChild(next); root.appendChild(navigation);
    var foot = element('p', 'stats-footnote', '仅保存时段汇总；Light 倾向是随机权重，并非壁纸实际出现频率。'); root.appendChild(foot);

    /* ---- 场志：地形图与概率分布同排，关系与驾驶志同排，名册通栏 ---- */
    var field = options.field || null, fieldView = null, rosterPick = 0, rosterSpin = 0;
    var fieldColumns = null;
    if (field) {
      var intro = element('div', 'stats-field-intro');
      intro.appendChild(element('p', 'stats-field-intro-text', '浮光不是无名的。#01–#49，四十九位固定居民：每次回到主页，抽签决定谁在场；撞过谁、躲过谁、为谁出过击，都写进各自的档案。名册在此，故事开始。'));
      var introRow = element('div', 'stats-field-intro-row');
      var badgeToggle = element('button', 'wp-random collision-random stats-badge-toggle');
      badgeToggle.type = 'button';
      badgeToggle.setAttribute('aria-pressed', String(!options.idBadge || options.idBadge.get() !== false));
      badgeToggle.setAttribute('aria-label', '碰到浮光时显示其对应编号');
      badgeToggle.innerHTML = '<span>碰到浮光时显示其对应编号</span><i class="wp-track" aria-hidden="true"><i class="wp-knob"></i></i>';
      badgeToggle.addEventListener('click', function () {
        if (!options.idBadge) return;
        var next = badgeToggle.getAttribute('aria-pressed') !== 'true';
        badgeToggle.setAttribute('aria-pressed', String(next));
        options.idBadge.set(next);
      });
      introRow.appendChild(badgeToggle); intro.appendChild(introRow); root.appendChild(intro);
      fieldColumns = element('div', 'stats-columns'); root.appendChild(fieldColumns);
      var terrainSection = element('section', 'stats-section stats-terrain');
      terrainSection.appendChild(element('h4', '', '浮光地形图'));
      terrainSection.appendChild(element('p', 'stats-caption', '颜色越深，浮光在该区域驻留越久——它们自己走出来的地形'));
      var terrainHost = element('div', 'stats-chart stats-terrain-host'); terrainSection.appendChild(terrainHost); fieldColumns.appendChild(terrainSection);
      var driveSection = element('section', 'stats-section stats-drive');
      var driveHead = element('div', 'stats-chart-heading');
      driveHead.appendChild(element('h4', '', '驾驶志'));
      var driveLegend = element('div', 'stats-social-legend');
      [['contact', '自然碰撞'], ['bump', '邂逅·撞撞'], ['dodge', '邂逅·回避'], ['autoHit', 'FSD 冲撞']].forEach(function (item) {
        driveLegend.appendChild(element('span', 'stats-social-chip stats-chip-' + item[0], item[1]));
      });
      driveHead.appendChild(driveLegend); driveSection.appendChild(driveHead);
      var driveNumbers = element('p', 'stats-caption'); driveSection.appendChild(driveNumbers);
      var driveHost = element('div', 'stats-chart'); driveSection.appendChild(driveHost); fieldColumns.appendChild(driveSection);
      var rosterSection = element('section', 'stats-section stats-roster');
      rosterSection.appendChild(element('h4', '', '名册'));
      rosterSection.appendChild(element('p', 'stats-caption', '49 位固定居民，累计档案；点亮者为当前在场，颜色越深，在 49 位里越主动'));
      var rosterGrid = element('div', 'stats-roster-grid'); rosterSection.appendChild(rosterGrid);
      var rosterDetail = element('div', 'stats-roster-detail'); rosterSection.appendChild(rosterDetail);
      fieldColumns.appendChild(rosterSection);
    }
    function fmtDuration(seconds) {
      seconds = Math.round(seconds);
      if (seconds < 60) return seconds + ' 秒';
      if (seconds < 3600) return Math.round(seconds / 60) + ' 分钟';
      var h = Math.floor(seconds / 3600), m = Math.round((seconds - h * 3600) / 60);
      return m ? h + ' 小时 ' + m + ' 分' : h + ' 小时';
    }
    function fmtEventTime(time) { var d = new Date(time); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
    var fieldEventNames = { contact: '自然碰撞', bump: '撞撞', dodge: '回避', charge: '出击', miss: '扑空', autoHit: '命中', relay: '接力', pilot: '得舵', push: '手拨' };
    function aggregateDays(rows, pick) {
      if (rows.length <= 60) return rows.map(function (row) { return { day: row.day, values: pick(row) }; });
      var per = Math.ceil(rows.length / 52), out = [];
      for (var i = 0; i < rows.length; i += per) {
        var chunk = rows.slice(i, i + per), sum = chunk.length ? pick(chunk[0]).map(function () { return 0; }) : [];
        chunk.forEach(function (row) { pick(row).forEach(function (v, j) { sum[j] += v; }); });
        out.push({ day: chunk[0].day, values: sum });
      }
      return out;
    }
    // 每张图按自己所在的栏宽绘制：宽屏两栏时不再借用地形图的宽度。
    function chartWidth(host) {
      var width = Math.round(host.getBoundingClientRect().width);
      return width > 0 ? Math.max(200, width) : 480;
    }
    // 纵轴的顶：取 1–2–5 阶里刚好盖住最大值的那一档
    function niceTop(value) {
      var base = Math.pow(10, Math.floor(Math.log10(Math.max(value, 1)))), steps = [1, 2, 5, 10];
      for (var i = 0; i < steps.length; i++) if (base * steps[i] >= value) return base * steps[i];
      return base * 10;
    }
    function pad2(n) { return String(n).padStart(2, '0'); }
    // 取景：区域按 1560×1040 的设计坐标给出，图幅在区域外留 FIT_CELLS 格，虚框外推 FRAME_CELLS 格
    var REGION_W = 1560, REGION_H = 1040, FIT_CELLS = 1.6, FRAME_CELLS = 1;
    // 区域整体向外挪 distance 像素：顶点沿两条邻边的外法线角平分线外推，尖角限幅，凹角自动收
    function offsetOutline(points, distance) {
      var n = points.length, area = 0, out = [], i;
      for (i = 0; i < n; i++) { var a = points[i], b = points[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
      var flip = area > 0 ? 1 : -1;
      function outward(a, b) {
        var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        return [dy / len * flip, -dx / len * flip];
      }
      for (i = 0; i < n; i++) {
        var cur = points[i], u = outward(points[(i + n - 1) % n], cur), v = outward(cur, points[(i + 1) % n]);
        var mx = u[0] + v[0], my = u[1] + v[1], len = Math.hypot(mx, my);
        if (len < 1e-6) { out.push([cur[0] + u[0] * distance, cur[1] + u[1] * distance]); continue; }
        var cos = (u[0] * mx + u[1] * my) / len, reach = distance / (cos > 0.78 ? cos : 0.78);
        out.push([cur[0] + mx / len * reach, cur[1] + my / len * reach]);
      }
      return out;
    }
    function drawField() {
      if (!field) return;
      fieldView = field.getView(range);
      // 场志这一侧两块图共用一块浮层：谁都没选就收起。
      if (!terrainSel && impactsSel < 0) fieldTip.hidden = true;
      var tw = chartWidth(terrainHost);
      // 浮光地形图
      (function () {
        terrainHost.textContent = '';
        var gw = fieldView.gridW, gh = fieldView.gridH;
        var region = window.AiraInteraction && AiraInteraction._test ? AiraInteraction._test.REGION : null;
        // 图幅跟着待命区域走：区域只占场地的中段，整块场地铺开会把图缩得很小。
        var x0 = 0, y0 = 0, x1 = 1, y1 = 1;
        if (region) {
          var minX = 1, minY = 1, maxX = 0, maxY = 0;
          region.forEach(function (p) {
            var nx = p[0] / REGION_W, ny = p[1] / REGION_H;
            minX = Math.min(minX, nx); maxX = Math.max(maxX, nx); minY = Math.min(minY, ny); maxY = Math.max(maxY, ny);
          });
          x0 = minX - FIT_CELLS / gw; x1 = maxX + FIT_CELLS / gw; y0 = minY - FIT_CELLS / gh; y1 = maxY + FIT_CELLS / gh;
        }
        var cw = x1 - x0, ch = y1 - y0;
        // 左边 12px 留给行号、上边 10px 留给列字母；格子仍保持正方。
        var refX = 12, refY = 10;
        var mapW = tw - refX, th = Math.max(120, Math.round(mapW * gh * ch / (gw * cw))) + refY, mapH = th - refY;
        var cell = mapW / (gw * cw);
        function px(n) { return (refX + (n - x0) / cw * mapW).toFixed(1); }
        function py(n) { return (refY + (n - y0) / ch * mapH).toFixed(1); }
        var totalHeat = 0;
        fieldView.grid.forEach(function (n) { totalHeat += n; });
        var svg = svgNode('svg', { viewBox: '0 0 ' + tw + ' ' + th, width: tw, height: th, role: 'img',
          'aria-label': '浮光常驻热力图，列 A–Z、行 1–12，每格以字母加行号称呼；轻点格子看它占总驻留的比例' });
        // 参考框：上边列字母、左边行号。每格的名字就是「字母 + 行号」，第一行不带数字，A 用完一轮就 A2、B2。
        var firstCol = Math.max(0, Math.floor(x0 * gw)), lastCol = Math.min(gw - 1, Math.ceil(x1 * gw) - 1);
        var firstRow = Math.max(0, Math.floor(y0 * gh)), lastRow = Math.min(gh - 1, Math.ceil(y1 * gh) - 1);
        var roomy = mapW / (gw * cw) >= 14;
        for (var refC = firstCol; refC <= lastCol; refC++) {
          if (!roomy && (refC - firstCol) % 2) continue;
          var refX2 = Number(px((refC + .5) / gw));
          if (refX2 < refX + 3 || refX2 > tw - 3) continue;   // 被裁掉一半的首末列不标，免得字母越出画布
          svg.appendChild(svgNode('text', { x: refX2.toFixed(1), y: refY - 2.5, 'text-anchor': 'middle', class: 'stats-terrain-ref' }, String.fromCharCode(65 + refC)));
        }
        for (var refR = firstRow; refR <= lastRow; refR++) {
          if (!roomy && (refR - firstRow) % 2) continue;
          var refY2 = Number(py((refR + .5) / gh));
          if (refY2 < refY + 3 || refY2 > th - 3) continue;
          svg.appendChild(svgNode('text', { x: refX - 3, y: (refY2 + 2.5).toFixed(1), 'text-anchor': 'end', class: 'stats-terrain-ref' }, String(refR + 1)));
        }
        if (region) {
          var outline = offsetOutline(region.map(function (p) { return [Number(px(p[0] / REGION_W)), Number(py(p[1] / REGION_H))]; }), cell * FRAME_CELLS);
          svg.appendChild(svgNode('polygon', { points: outline.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), class: 'stats-terrain-region' }));
        }
        // 深浅看分位，不看绝对值：日子久了每个格子都会被踩深，只有相对深度一直读得出来。
        var depth = [];
        fieldView.grid.forEach(function (n) { if (n > 0) depth.push(n); });
        function shade(n) {
          if (depth.length < 2) return 1;
          var reached = 0;
          depth.forEach(function (v) { if (v <= n) reached++; });
          return reached / depth.length;
        }
        for (var gy = 0; gy < gh; gy++) for (var gx = 0; gx < gw; gx++) {
          var n = fieldView.grid[gy * gw + gx];
          if (!n) continue;
          svg.appendChild(svgNode('rect', { x: px(gx / gw), y: py(gy / gh), width: (cell - 0.7).toFixed(1), height: (cell - 0.7).toFixed(1), rx: 1.5,
            class: 'stats-terrain-cell', opacity: (0.08 + 0.85 * shade(n)).toFixed(3) }));
        }
        terrainGeo = { left: refX, top: refY, width: mapW, height: mapH, x0: x0, y0: y0, cw: cw, ch: ch, gw: gw, gh: gh, total: totalHeat };
        if (terrainSel) {
          var selCol = Math.max(0, Math.min(gw - 1, terrainSel.col)), selRow = Math.max(0, Math.min(gh - 1, terrainSel.row));
          var selN = fieldView.grid[selRow * gw + selCol] || 0;
          svg.appendChild(svgNode('rect', { x: px(selCol / gw), y: py(selRow / gh), width: (cell - 0.7).toFixed(1), height: (cell - 0.7).toFixed(1), rx: 1.5, class: 'stats-terrain-pick' }));
          fieldTip.hidden = false;
          fieldTipTitle.textContent = terrainCode(selCol, selRow);
          fieldTipValue.textContent = selN ? '占全部驻留的 ' + fmt(100 * selN / (totalHeat || 1)) + '%' : '本格暂无驻留';
          fieldTipExtra.textContent = selN ? '本格驻留约 ' + fmtDuration(selN * 4) : '';
          var rootRect = root.getBoundingClientRect(), hostRect = terrainHost.getBoundingClientRect();
          // 地形图的浮层内容短，随内容收窄即可。
          fieldTip.style.width = 'auto'; fieldTip.style.maxWidth = Math.min(190, rootRect.width) + 'px';
          fieldTip.style.left = Math.max(0, Math.min(rootRect.width - fieldTip.offsetWidth, hostRect.left - rootRect.left + Number(px((selCol + .5) / gw)) + 8)) + 'px';
          fieldTip.style.top = Math.max(0, Math.min(rootRect.height - 40, hostRect.top - rootRect.top + Number(py((selRow + 1) / gh)) - 6)) + 'px';
        }
        terrainHost.appendChild(svg);
      })();
      // 碰撞力度：横轴是碰撞瞬间两枚的相对速度（像素/秒），纵轴是次数。
      // 相对速度对「自然碰撞」与「FSD 冲撞」才有意义，手拨推挤不计入。
      (function () {
        if (!impacts) return;
        impacts.host.textContent = '';
        var buckets = fieldView.impacts || [], edges = fieldView.impactEdges || [], peak = fieldView.impactPeak || [0, 0, 0, 0];
        var total = buckets.reduce(function (sum, n) { return sum + n; }, 0);
        var w = chartWidth(impacts.host), h = 158, g = { left: 44, top: 15, width: w - 54, height: h - 53 };
        impacts.g = g;
        var top = niceTop(Math.max.apply(null, buckets.concat([1])));
        function y(v) { return g.top + g.height * (1 - v / top); }
        var svg = svgNode('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, role: 'img',
          'aria-label': total ? '碰撞力度分布，共 ' + total + ' 次；最狠的一次 #' + pad2(peak[1]) + ' 与 #' + pad2(peak[2]) + '，' + Math.round(peak[0]) + ' 像素/秒' : '碰撞力度分布' });
        impacts.host.appendChild(svg);
        impactsNote.hidden = !peak[0];
        impactsNote.textContent = peak[0] ? '最狠 #' + pad2(peak[1]) + ' × #' + pad2(peak[2]) + ' · ' + Math.round(peak[0]) + ' 像素/秒' : '';
        if (!total) {
          svg.appendChild(svgNode('text', { x: g.left + g.width / 2, y: g.top + g.height / 2, 'text-anchor': 'middle', class: 'stats-empty' }, fieldView.status === 'error' ? '浮光志暂不可用' : '还没有碰撞记录'));
          return;
        }
        [0, Math.round(top / 2), top].forEach(function (v, i, all) {
          if (all.indexOf(v) !== i) return;
          svg.appendChild(svgNode('line', { x1: g.left, x2: w - 10, y1: y(v), y2: y(v), class: 'stats-grid' }));
          svg.appendChild(svgNode('text', { x: g.left - 9, y: y(v) + 4, 'text-anchor': 'end', class: 'stats-axis' }, String(v)));
        });
        var slot = g.width / buckets.length, gap = Math.min(5, slot * .16);
        // 档位标签：按栏宽等距取几个，两端始终在场，窄栏减半。
        var labelCount = w < 440 ? 4 : 7, chosen = [];
        for (var i = 0; i < labelCount; i++) { var index = Math.round(i * (buckets.length - 1) / (labelCount - 1)); if (chosen.indexOf(index) < 0) chosen.push(index); }
        buckets.forEach(function (n, i) {
          var bar = g.height * Math.min(1, n / top);
          svg.appendChild(svgNode('rect', { x: (g.left + i * slot + gap).toFixed(2), y: (g.top + g.height - bar).toFixed(2),
            width: (slot - gap * 2).toFixed(2), height: Math.max(n ? 1.2 : 0, bar).toFixed(2), rx: 2,
            class: 'stats-impact-bar' + (i === impactsSel ? ' is-selected' : '') }));
          if (chosen.indexOf(i) < 0) return;
          svg.appendChild(svgNode('text', { x: (g.left + (i + .5) * slot).toFixed(2), y: h - 21, 'text-anchor': 'middle', class: 'stats-axis' },
            i < edges.length ? (i ? edges[i - 1] : 0) + '–' + edges[i] : edges[edges.length - 1] + '+'));
        });
        svg.appendChild(svgNode('text', { x: w - 10, y: h - 3, 'text-anchor': 'end', class: 'stats-axis stats-axis-title' }, '相对速度 · 像素/秒'));
        if (impactsSel >= buckets.length) impactsSel = -1;
        if (impactsSel >= 0) {
          fieldTip.hidden = false;
          fieldTipTitle.textContent = '相对速度 ' + (impactsSel < edges.length ? (impactsSel ? edges[impactsSel - 1] : 0) + '–' + edges[impactsSel] : edges[edges.length - 1] + '+') + ' 像素/秒';
          fieldTipValue.textContent = buckets[impactsSel] + ' 次（占 ' + fmt(100 * buckets[impactsSel] / total) + '%）';
          fieldTipExtra.textContent = '自然碰撞、FSD 冲撞与手拨的合计';
          var rootRect = root.getBoundingClientRect(), chartRect = impacts.host.getBoundingClientRect();
          fieldTip.style.width = Math.min(270, rootRect.width) + 'px'; fieldTip.style.maxWidth = Math.min(270, rootRect.width) + 'px';
          fieldTip.style.left = Math.max(0, Math.min(rootRect.width - fieldTip.offsetWidth, chartRect.left - rootRect.left + g.left + (impactsSel + .5) * slot + 10)) + 'px';
          fieldTip.style.top = chartRect.top - rootRect.top + 6 + 'px';
        }
      })();
      // 驾驶志
      (function () {
        var t = fieldView.totals, shots = t.hit + t.miss, missRate = shots ? Math.round(100 * t.miss / shots) : null;
        driveNumbers.textContent = '蓝档 ' + fmtDuration(t.blue) + ' · 橙档 ' + fmtDuration(t.rage)
          + ' · 出击 ' + shots + ' 次 · 命中 ' + t.hit + ' 次' + (missRate == null ? '' : ' · 扑空率 ' + missRate + '%')
          + ' · 接力 ' + t.relay + ' 次 · 得舵 ' + t.pilot + ' 次';
        driveHost.textContent = '';
        var rows = aggregateDays(fieldView.drive, function (row) { return [row.blue, row.rage]; });
        var dh = 56, w = chartWidth(driveHost), svg = svgNode('svg', { viewBox: '0 0 ' + w + ' ' + dh, width: w, height: dh, role: 'img', 'aria-label': '蓝橙驾驶时长随时间变化' });
        var max = 1;
        rows.forEach(function (row) { max = Math.max(max, row.values[0] + row.values[1]); });
        rows.forEach(function (row, i) {
          if (!(row.values[0] + row.values[1])) return;
          var x = 5 + i / rows.length * (w - 10), bw = Math.max(1, (w - 10) / rows.length - 2);
          var hb = row.values[0] / max * (dh - 18), hr = row.values[1] / max * (dh - 18);
          svg.appendChild(svgNode('rect', { x: x.toFixed(1), y: (dh - 14 - hb - hr).toFixed(1), width: bw.toFixed(1), height: Math.max(0.6, hb).toFixed(1), rx: 0.8, class: 'stats-seg stats-seg-autoHit' }));
          svg.appendChild(svgNode('rect', { x: x.toFixed(1), y: (dh - 14 - hr).toFixed(1), width: bw.toFixed(1), height: Math.max(0.6, hr).toFixed(1), rx: 0.8, class: 'stats-seg stats-seg-rage' }));
        });
        driveHost.appendChild(svg);
      })();
      // 名册
      (function () {
        rosterGrid.textContent = '';
        var active = new Set(typeof options.activeIds === 'function' ? options.activeIds() : []);
        // 性格星图浓缩成一档深浅：撞人与出击多于回避者更深。
        // 深浅看 49 位里的相对名次，不看绝对比例：排序时比例并列的再看活跃总量与编号，
        // 每个档案拿到唯一名次，四等分后每档人数均等，长期累积也不会挤成一色。
        var keenOf = function (p) { return p.bump + p.hit; }, shyOf = function (p) { return p.dodge; };
        var depthRank = {}, depthCount = 0;
        fieldView.profiles.map(function (p) {
          var keen = keenOf(p), shy = shyOf(p), total = keen + shy;
          return { id: p.id, total: total, ratio: total ? keen / total : 0 };
        }).filter(function (d) { return d.total > 0; })
          .sort(function (a, b) { return a.ratio - b.ratio || a.total - b.total || a.id - b.id; })
          .forEach(function (d) { depthRank[d.id] = depthCount; depthCount++; });
        function toneOf(p) {
          if (depthRank[p.id] == null || !depthCount) return -1;
          return Math.min(3, Math.floor(depthRank[p.id] / depthCount * 4));
        }
        fieldView.profiles.forEach(function (p) {
          var chip = element('button', 'stats-roster-chip', pad2(p.id));
          chip.type = 'button'; chip.dataset.id = p.id;
          var hasData = p.appearances || p.minutes || p.bump || p.taken || p.dodge || p.hit || p.miss;
          var tone = toneOf(p);
          if (tone >= 0) chip.classList.add('is-tone-' + tone);
          chip.classList.toggle('is-active', active.has(p.id));
          chip.classList.toggle('is-quiet', !hasData);
          chip.classList.toggle('is-picked', rosterPick === p.id);
          chip.setAttribute('aria-label', '第 ' + p.id + ' 号浮光的档案' + (tone < 0 ? '' : ' · ' + ['最回避', '偏回避', '偏主动', '最主动'][tone]));
          chip.addEventListener('click', function () {
            rosterPick = rosterPick === p.id ? 0 : p.id;
            if (rosterPick) rosterSpin = Math.random() * Math.PI * 2;
            drawField();
          });
          rosterGrid.appendChild(chip);
        });
        rosterDetail.textContent = '';
        if (rosterPick) {
          var p = fieldView.profiles[rosterPick - 1], shots = p.hit + p.miss;
          var card = element('div', 'stats-roster-card');
          card.appendChild(element('strong', '', '#' + pad2(rosterPick) + ' 号浮光'));
          card.appendChild(element('p', '', '出场 ' + p.appearances + ' 次 · 在场 ' + fmtDuration(p.minutes * 60)
            + ' · 撞人 ' + p.bump + ' · 被撞 ' + p.taken + ' · 回避 ' + p.dodge));
          card.appendChild(element('p', '', '出击 ' + shots + ' · 命中 ' + p.hit + (shots ? ' · 扑空率 ' + Math.round(100 * p.miss / shots) + '%' : ' · 尚未出击')
            + ' · 得舵 ' + p.pilot + ' · 接力 ' + p.relayIn + '/' + p.relayOut));
          var friendsAll = fieldView.pairs.filter(function (pair) { return pair.a === rosterPick || pair.b === rosterPick; });
          if (friendsAll.length) {
            card.appendChild(element('p', 'stats-roster-friends', '密友榜：' + friendsAll.slice(0, 3).map(function (pair) {
              var other = pair.a === rosterPick ? pair.b : pair.a;
              return '#' + pad2(other) + '（亲近 ' + pair.nearMinutes + ' 分钟 · 碰撞 ' + pair.contact + '）';
            }).join('、')));
            // 关系网：居中是它，四周是它最亲的几位。弧线停在圆外 gap 处，点到即止，不插进圆里。
            // 越亲的邻居站得越远：基础半径留给最疏的一位，最亲的向外多走 reach，一圈等距的正多边形不再。
            // 邻居按关系分顺时针渐疏，但每次点开整体转一个随机起角：同一编号点两次就是两张图。
            var top = friendsAll.slice(0, 6), maxScore = top[0] ? top[0].contact * 3 + top[0].nearMinutes : 1;
            var nearMin = top.length ? top[top.length - 1].contact * 3 + top[top.length - 1].nearMinutes : 1;
            var web = svgNode('svg', { viewBox: '0 0 260 180', class: 'stats-web', role: 'img', 'aria-label': '关系网' });
            var cx = 130, cy = 90, radius = 55, reach = 16, nodeR = 13, selfR = 15, gap = 3, bow = 10;
            // 二分收笔参数：让曲线端点离该端圆心恰为半径+gap。副曲线控制点用 blossom 求得，线形与整条弧一致。
            function webCut(p0, p1, p2, center, clear, fromStart) {
              var lo = 0, hi = 1, t, s, px, py, d;
              for (var k = 0; k < 26; k++) {
                t = (lo + hi) / 2; s = 1 - t;
                px = s * s * p0[0] + 2 * t * s * p1[0] + t * t * p2[0];
                py = s * s * p0[1] + 2 * t * s * p1[1] + t * t * p2[1];
                d = Math.hypot(px - center[0], py - center[1]);
                if (fromStart ? d < clear : d > clear) lo = t; else hi = t;
              }
              return (lo + hi) / 2;
            }
            function webAt(t, p0, p1, p2) {
              var s = 1 - t;
              return [s * s * p0[0] + 2 * t * s * p1[0] + t * t * p2[0], s * s * p0[1] + 2 * t * s * p1[1] + t * t * p2[1]];
            }
            top.forEach(function (pair, i) {
              var other = pair.a === rosterPick ? pair.b : pair.a;
              var angle = rosterSpin - Math.PI / 2 + i * (Math.PI * 2 / top.length);
              var score = pair.contact * 3 + pair.nearMinutes, hits = pair.hitAB + pair.hitBA, dodges = pair.dodgeAB + pair.dodgeBA;
              var rad = radius + (maxScore > nearMin ? reach * (score - nearMin) / (maxScore - nearMin) : 0);
              var nx = cx + Math.cos(angle) * rad, ny = cy + Math.sin(angle) * rad;
              var tone = hits > 0 ? 'stats-web-blue' : dodges * 2 > pair.contact ? 'stats-web-sage' : 'stats-web-gray';
              var p0 = [cx, cy], dx = nx - cx, dy = ny - cy, len = Math.hypot(dx, dy) || 1;
              var p1 = [(cx + nx) / 2 - dy / len * bow, (cy + ny) / 2 + dx / len * bow], p2 = [nx, ny];
              var t0 = webCut(p0, p1, p2, p0, selfR + gap, true), t1 = webCut(p0, p1, p2, p2, nodeR + gap, false);
              var start = webAt(t0, p0, p1, p2), end = webAt(t1, p0, p1, p2), s0 = 1 - t0, s1 = 1 - t1;
              var qx = s0 * s1 * cx + (t0 * s1 + t1 * s0) * p1[0] + t0 * t1 * nx, qy = s0 * s1 * cy + (t0 * s1 + t1 * s0) * p1[1] + t0 * t1 * ny;
              web.appendChild(svgNode('path', { d: 'M' + start[0].toFixed(1) + ',' + start[1].toFixed(1) + ' Q' + qx.toFixed(1) + ',' + qy.toFixed(1) + ' ' + end[0].toFixed(1) + ',' + end[1].toFixed(1),
                class: 'stats-web-link ' + tone, 'stroke-width': (0.8 + 2.6 * score / (maxScore || 1)).toFixed(2) }));
              web.appendChild(svgNode('circle', { cx: nx.toFixed(1), cy: ny.toFixed(1), r: nodeR, class: 'stats-web-node' }));
              web.appendChild(svgNode('text', { x: nx.toFixed(1), y: (ny + 3.2).toFixed(1), 'text-anchor': 'middle', class: 'stats-web-id' }, pad2(other)));
            });
            web.appendChild(svgNode('circle', { cx: cx, cy: cy, r: selfR, class: 'stats-web-self' }));
            web.appendChild(svgNode('text', { x: cx, y: cy + 3.2, 'text-anchor': 'middle', class: 'stats-web-id stats-web-self-id' }, pad2(rosterPick)));
            card.appendChild(web);
          }
          // 三角：与它互亲最强的一组三驾马车，读取时即时计算，不落存储
          var byKey = new Map();
          fieldView.pairs.forEach(function (pair) { byKey.set(pair.a + ',' + pair.b, pair); });
          var scoreOf = function (a, b) { var pr = byKey.get(Math.min(a, b) + ',' + Math.max(a, b)); return pr ? pr.contact * 3 + pr.nearMinutes : 0; };
          var bestTrio = null;
          for (var fi = 0; fi < friendsAll.length; fi++) for (var fj = fi + 1; fj < friendsAll.length; fj++) {
            var tx = friendsAll[fi].a === rosterPick ? friendsAll[fi].b : friendsAll[fi].a;
            var ty = friendsAll[fj].a === rosterPick ? friendsAll[fj].b : friendsAll[fj].a;
            var ts = scoreOf(rosterPick, tx) + scoreOf(rosterPick, ty) + scoreOf(tx, ty);
            if (ts > 0 && (!bestTrio || ts > bestTrio.s)) bestTrio = { x: tx, y: ty, s: ts };
          }
          if (bestTrio) {
            var nearSum = 0, contactSum = 0;
            [[rosterPick, bestTrio.x], [rosterPick, bestTrio.y], [bestTrio.x, bestTrio.y]].forEach(function (edge) {
              var pr = byKey.get(Math.min(edge[0], edge[1]) + ',' + Math.max(edge[0], edge[1]));
              if (pr) { nearSum += pr.nearMinutes; contactSum += pr.contact; }
            });
            card.appendChild(element('p', 'stats-roster-trio', '三角：#' + pad2(rosterPick) + ' · #' + pad2(bestTrio.x) + ' · #' + pad2(bestTrio.y) + '（亲近合计 ' + nearSum + ' 分钟 · 互撞 ' + contactSum + ' 次）'));
          }
          var events = fieldView.events.filter(function (event) { return event[2] === rosterPick || event[3] === rosterPick; }).slice(0, 3);
          if (events.length) {
            card.appendChild(element('p', 'stats-roster-events', '最近：' + events.map(function (event) {
              return fmtEventTime(event[0]) + ' ' + (event[1] === 'bump' || event[1] === 'dodge' || event[1] === 'autoHit' || event[1] === 'charge' || event[1] === 'miss'
                ? (event[2] === rosterPick ? fieldEventNames[event[1]] + ' → #' + pad2(event[3]) : '#' + pad2(event[3]) + ' ' + fieldEventNames[event[1]] + ' → 我')
                : fieldEventNames[event[1]] + (event[3] ? ' · #' + pad2(event[3]) : ''));
            }).join('；')));
          }
          rosterDetail.appendChild(card);
        }
      })();
    }
    var tooltip = element('div', 'stats-tooltip'); tooltip.hidden = true; tooltip.setAttribute('aria-hidden', 'true');
    var tooltipTitle = element('strong'), tooltipValue = element('p'), tooltipExtra = element('p');
    tooltip.appendChild(tooltipTitle); tooltip.appendChild(tooltipValue); tooltip.appendChild(tooltipExtra); root.appendChild(tooltip);
    var fieldTip = element('div', 'stats-tooltip'); fieldTip.hidden = true; fieldTip.setAttribute('aria-hidden', 'true');
    var fieldTipTitle = element('strong'), fieldTipValue = element('p'), fieldTipExtra = element('p');
    fieldTip.appendChild(fieldTipTitle); fieldTip.appendChild(fieldTipValue); fieldTip.appendChild(fieldTipExtra); root.appendChild(fieldTip);
    var charts = [probability, activity, heat];
    function formatted(time, type) {
      var d = new Date(time + view.offsetMinutes * 60000), pad = function (v) { return String(v).padStart(2, '0'); };
      if (type === 'hour') return pad(d.getUTCHours()) + ':00';
      if (type === 'year') return String(d.getUTCFullYear());
      if (type === 'month') return d.getUTCFullYear() + '/' + pad(d.getUTCMonth() + 1);
      return (d.getUTCMonth() + 1) + '/' + d.getUTCDate();
    }
    function longTime(b) {
      var d = new Date(b.start + view.offsetMinutes * 60000), date = d.getUTCFullYear() + ' 年 ' + (d.getUTCMonth() + 1) + ' 月 ' + d.getUTCDate() + ' 日';
      if (view.granularity === 'hour') return date + ' · ' + formatted(b.start, 'hour') + '–' + formatted(b.end, 'hour');
      if (view.granularity === 'day') return date;
      if (view.granularity === 'year' && view.intervalYears > 1) return formatted(b.start, 'year') + '–' + formatted(b.end - 1, 'year') + ' 年';
      return formatted(b.start, view.granularity) + (view.granularity === 'year' ? ' 年' : '');
    }
    function fmt(n) { return Number(n.toFixed(1)).toLocaleString('zh-CN'); }
    function choose(event, chart) {
      if (!view || !view.buckets.length || !chart.geometry) return;
      var rect = chart.host.getBoundingClientRect(), g = chart.geometry;
      selected = Math.max(0, Math.min(view.buckets.length - 1, Math.floor((event.clientX - rect.left - g.left) / g.width * view.buckets.length)));
      selectedBin = chart.kind === 'heat' ? Math.max(0, Math.min(19, Math.floor((g.top + g.height - (event.clientY - rect.top)) / g.height * 20))) : null;
      activeChart = chart; impactsSel = -1;
      draw(); drawField();
    }
    charts.forEach(function (chart) {
      var held = false;
      chart.host.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        held = true; chart.host.setPointerCapture(event.pointerId); choose(event, chart);
      });
      chart.host.addEventListener('pointermove', function (event) { if (held) choose(event, chart); });
      chart.host.addEventListener('pointerup', function () { held = false; });
      chart.host.addEventListener('pointercancel', function () { held = false; });
    });
    // 碰撞力度的点选：按住某一档看它的详情，与时间图表共用一套互斥与收起逻辑。
    if (impacts) {
      var impactsHeld = false;
      function chooseImpacts(event) {
        var g = impacts.g, count = fieldView && fieldView.impacts ? fieldView.impacts.length : 0;
        if (!g || !count) return;
        impactsSel = Math.max(0, Math.min(count - 1, Math.floor((event.clientX - impacts.host.getBoundingClientRect().left - g.left) / g.width * count)));
        terrainSel = null; activeChart = null; draw(); drawField();
      }
      impacts.host.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        impactsHeld = true; impacts.host.setPointerCapture(event.pointerId); chooseImpacts(event);
      });
      impacts.host.addEventListener('pointermove', function (event) { if (impactsHeld) chooseImpacts(event); });
      impacts.host.addEventListener('pointerup', function () { impactsHeld = false; });
      impacts.host.addEventListener('pointercancel', function () { impactsHeld = false; });
    }
    // 地形图的点选：按住任意一格（含空格）看它占总驻留的比例。
    if (terrainHost) {
      var terrainHeld = false;
      function chooseTerrain(event) {
        var g = terrainGeo; if (!g) return;
        var rect = terrainHost.getBoundingClientRect();
        var nx = (event.clientX - rect.left - g.left) / g.width, ny = (event.clientY - rect.top - g.top) / g.height;
        terrainSel = {
          col: Math.max(0, Math.min(g.gw - 1, Math.floor((g.x0 + nx * g.cw) * g.gw))),
          row: Math.max(0, Math.min(g.gh - 1, Math.floor((g.y0 + ny * g.ch) * g.gh)))
        };
        impactsSel = -1; activeChart = null; draw(); drawField();
      }
      terrainHost.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        terrainHeld = true; terrainHost.setPointerCapture(event.pointerId); chooseTerrain(event);
      });
      terrainHost.addEventListener('pointermove', function (event) { if (terrainHeld) chooseTerrain(event); });
      terrainHost.addEventListener('pointerup', function () { terrainHeld = false; });
      terrainHost.addEventListener('pointercancel', function () { terrainHeld = false; });
    }
    // Tap anywhere outside the charts to let the floating card go. Capture phase:
    // choose() re-renders and detaches the original target before it bubbles up.
    root.addEventListener('pointerdown', function (event) {
      if (!activeChart && impactsSel < 0 && !terrainSel) return;
      if (event.target && event.target.closest && event.target.closest('.stats-chart')) return;
      activeChart = null; impactsSel = -1; terrainSel = null; draw(); drawField();
    }, true);
    function drawChart(chart) {
      var w = Math.max(220, Math.round(chart.host.getBoundingClientRect().width)), h = chart.kind === 'probability' ? 192 : chart.kind === 'heat' ? 158 : 152;
      var g = { left: 44, top: 15, width: w - 54, height: h - 53 }; chart.geometry = g;
      chart.host.textContent = '';
      var svg = svgNode('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, role: 'img', 'aria-label': chart.kind === 'probability' ? 'Light 概率随时间变化，纵轴百分比，横轴时间' : chart.kind === 'activity' ? sources[source] + '次数随时间变化' : '时间与 Light 概率区间的分布热力图' });
      chart.host.appendChild(svg);
      svg.appendChild(svgNode('title', {}, chart.kind === 'heat' ? '每个时段的概率分布占比' : '点击时段查看统计'));
      var bins = view.buckets, count = bins.length, x = function (i) { return g.left + (i + 0.5) / count * g.width; };
      var max = chart.kind === 'activity' ? Math.max(2, Math.ceil(Math.max.apply(null, bins.map(function (b) { return b[source]; }).concat([0])) / 2) * 2) : 100;
      var y = function (v) { return g.top + g.height * (1 - v / max); };
      var ticks = chart.kind === 'activity' ? [0, max / 2, max] : [0, 50, 100];
      ticks.forEach(function (tick) {
        if (chart.kind !== 'heat') svg.appendChild(svgNode('line', { x1: g.left, x2: w - 10, y1: y(tick), y2: y(tick), class: tick === 50 && chart.kind === 'probability' ? 'stats-grid stats-midline' : 'stats-grid' }));
        svg.appendChild(svgNode('text', { x: g.left - 9, y: y(tick) + 4, 'text-anchor': 'end', class: 'stats-axis' }, chart.kind === 'activity' ? tick : tick + '%'));
      });
      var tickCount = w < 440 ? 3 : 5, chosen = [];
      for (var i = 0; i < tickCount; i++) { var index = Math.round(i * (count - 1) / (tickCount - 1)); if (!chosen.includes(index)) chosen.push(index); }
      chosen.forEach(function (index, i) {
        var b = bins[index]; if (!b) return;
        var label = formatted(b.start, view.granularity === 'hour' && view.end - view.start > 86400000 ? 'day' : view.granularity);
        svg.appendChild(svgNode('text', { x: x(index), y: h - 21, 'text-anchor': i === 0 ? 'start' : i === chosen.length - 1 ? 'end' : 'middle', class: 'stats-axis' }, label));
      });
      svg.appendChild(svgNode('text', { x: w - 10, y: h - 3, 'text-anchor': 'end', class: 'stats-axis stats-axis-title' }, '时间 · 按' + names[view.granularity]));
      if (chart.kind === 'heat') {
        bins.forEach(function (b, i) {
          if (!b.n) return;
          b.hist.forEach(function (n, j) {
            if (!n) return;
            svg.appendChild(svgNode('rect', { x: g.left + i / count * g.width, y: g.top + (19 - j) / 20 * g.height,
              width: Math.max(0.5, g.width / count - (g.width / count > 5 ? 1 : 0)), height: Math.max(1, g.height / 20 - 0.6), rx: 1,
              class: 'stats-heat-cell', opacity: (0.1 + 0.78 * n / b.n).toFixed(3) }));
          });
        });
      } else {
        var defs = svgNode('defs'), gradient = svgNode('linearGradient', { id: 'stats-fill-' + chart.kind, x1: '0', x2: '0', y1: '0', y2: '1' });
        gradient.appendChild(svgNode('stop', { offset: '0%', 'stop-color': 'currentColor', 'stop-opacity': '.2' }));
        gradient.appendChild(svgNode('stop', { offset: '100%', 'stop-color': 'currentColor', 'stop-opacity': '0' })); defs.appendChild(gradient); svg.appendChild(defs);
        var segments = [], segment = [];
        bins.forEach(function (b, i) {
          var value = chart.kind === 'probability' ? b.mean : b.observed ? b[source] : null;
          if (value == null) { if (segment.length) segments.push(segment); segment = []; }
          else segment.push([x(i), y(value)]);
        });
        if (segment.length) segments.push(segment);
        segments.forEach(function (points) {
          var line = points.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' ');
          if (points.length > 1) {
            var area = line + ' L' + points[points.length - 1][0] + ',' + y(0) + ' L' + points[0][0] + ',' + y(0) + ' Z';
            svg.appendChild(svgNode('path', { d: area, fill: 'url(#stats-fill-' + chart.kind + ')', class: 'stats-area' }));
            svg.appendChild(svgNode('path', { d: line, class: 'stats-line' }));
          } else svg.appendChild(svgNode('circle', { cx: points[0][0], cy: points[0][1], r: 2.4, class: 'stats-point' }));
        });
      }
      if (selected >= 0 && bins[selected]) {
        var b = bins[selected];
        svg.appendChild(svgNode('line', { x1: x(selected), x2: x(selected), y1: g.top, y2: g.top + g.height, class: 'stats-guide', 'data-selected-time': b.start }));
        var value = chart.kind === 'probability' ? b.mean : b.observed ? b[source] : null;
        if (chart.kind !== 'heat' && value != null) svg.appendChild(svgNode('circle', { cx: x(selected), cy: y(value), r: 3.5, class: 'stats-selected-point' }));
        if (chart.kind === 'heat' && selectedBin != null) svg.appendChild(svgNode('rect', { x: g.left + selected / count * g.width, y: g.top + (19 - selectedBin) / 20 * g.height, width: g.width / count, height: g.height / 20, class: 'stats-selected-bin' }));
      }
      if (!view.totals.n && chart.kind !== 'activity') svg.appendChild(svgNode('text', { x: g.left + g.width / 2, y: g.top + g.height / 2, 'text-anchor': 'middle', class: 'stats-empty' }, view.status === 'error' ? '统计暂不可用' : view.status === 'loading' ? '正在读取…' : '等待第一次主动调节'));
    }
    function draw() {
      if (destroyed || !view) return;
      charts.forEach(drawChart);
      var b = view.buckets[selected];
      previous.disabled = selected <= 0; next.disabled = selected >= view.buckets.length - 1;
      if (!b) return;
      var zoomed = view.granularity !== 'hour' ? store.getView({ start: b.start, end: b.end }) : null;
      zoom.hidden = !zoomed || (zoomed.granularity === view.granularity && zoomed.intervalYears === view.intervalYears);
      detailTime.textContent = longTime(b);
      detailValues.textContent = b.n ? '平均 Light ' + fmt(b.mean) + '% · 范围 ' + b.min + '–' + b.max + '% · 有效调节 ' + b.n + ' 次' : b.observed ? '本时段没有概率样本' : '本时段尚无记录';
      detailExtra.textContent = b.observed ? '拖动 ' + b.drag + ' · 键盘 ' + b.keyboard + ' · 手动 ' + b.manual + ' · 添加 ' + b.add : '记录开始前及未来时段不补零。';
      if (selectedBin != null) {
        var n = b.hist[selectedBin];
        detailExtra.textContent += ' ｜ Light ' + selectedBin * 5 + '%–' + (selectedBin === 19 ? '' : '<') + (selectedBin + 1) * 5 + '%：' + n + ' 次' + (b.n ? '（' + fmt(100 * n / b.n) + '%）' : '');
      }
      tooltip.hidden = !activeChart;
      if (activeChart) {
        tooltipTitle.textContent = longTime(b);
        tooltipValue.textContent = activeChart.kind === 'activity' ? (b.observed ? sources[source] + ' ' + b[source] + ' 次' : '本时段尚无记录') : detailValues.textContent;
        tooltipExtra.textContent = selectedBin != null ? detailExtra.textContent.split(' ｜ ')[1] : activeChart.kind === 'activity' ? '一次完整操作计一次' : '浮光与手动调节的共同结果';
        var rootRect = root.getBoundingClientRect(), chartRect = activeChart.host.getBoundingClientRect(), g = activeChart.geometry;
        tooltip.style.width = Math.min(270, rootRect.width) + 'px';
        var left = chartRect.left - rootRect.left + g.left + (selected + .5) / view.buckets.length * g.width + 10;
        tooltip.style.left = Math.max(0, Math.min(rootRect.width - tooltip.offsetWidth, left)) + 'px';
        tooltip.style.top = chartRect.top - rootRect.top + 6 + 'px';
      }
    }
    function render() {
      if (destroyed) return;
      view = store.getView(range);
      if (selected < 0 || selected >= view.buckets.length) {
        selected = view.buckets.reduce(function (last, b, i) { return b.n || b.add ? i : last; }, -1);
        if (selected < 0) selected = Math.max(0, view.buckets.findIndex(function (b) { return b.observed; }));
      }
      Array.from(ranges.children).forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.range === range)); });
      zoomOut.hidden = typeof range === 'string';
      var offset = view.offsetMinutes, zone = 'UTC' + (offset >= 0 ? '+' : '−') + Math.floor(Math.abs(offset) / 60) + ':' + String(Math.abs(offset) % 60).padStart(2, '0');
      meta.textContent = '按' + (view.intervalYears > 1 ? view.intervalYears : '') + names[view.granularity] + '汇总 · ' + zone + ' · ' + view.totals.n + ' 次概率调节' + (view.compacted ? ' · 较早数据已合并' : '');
      statusText.textContent = view.message || (view.status === 'loading' ? '正在读取统计…' : view.status === 'saving' ? '正在保存…' : '');
      status.hidden = !statusText.textContent; retry.hidden = view.status !== 'error';
      root.dataset.status = view.status;
      draw();
      drawField();
    }
    var unsubscribe = store.subscribe(render);
    var unsubscribeField = field ? field.subscribe(render) : null;
    // 分栏宽度随面板变化：图表与场志都要按新的栏宽重绘。
    function resized() { if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { frame = null; draw(); drawField(); }); }
    var resize = typeof ResizeObserver === 'function' ? new ResizeObserver(resized) : null;
    if (resize) resize.observe(root); else window.addEventListener('resize', resized);
    render();
    return { destroy: function () { destroyed = true; unsubscribe(); if (unsubscribeField) unsubscribeField(); if (resize) resize.disconnect(); else window.removeEventListener('resize', resized); if (frame) cancelAnimationFrame(frame); root.remove(); } };
  }
  window.AiraStatsPanel = { mount: mount };
})();
