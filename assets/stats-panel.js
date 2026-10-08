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
    function makeChart(title, note, kind) {
      var section = element('section', 'stats-section stats-' + kind), head = element('div', 'stats-chart-heading');
      var h = element('h4', '', title); head.appendChild(h); section.appendChild(head);
      var caption = element('p', 'stats-caption', note); section.appendChild(caption);
      var host = element('div', 'stats-chart'); host.dataset.chart = kind; section.appendChild(host); root.appendChild(section);
      return { section: section, head: head, host: host, kind: kind, caption: caption };
    }
    var probability = makeChart('Light 倾向', '每个时段内，主动调节后的平均概率', 'probability');
    var activity = makeChart('交互次数', '一次完整操作计一次，自然游动不计入', 'activity');
    var selector = element('select', 'stats-source'); selector.setAttribute('aria-label', '交互行为类型');
    Object.keys(sources).forEach(function (key) { var opt = element('option', '', sources[key]); opt.value = key; selector.appendChild(opt); });
    selector.addEventListener('change', function () { source = selector.value; render(); }); activity.head.appendChild(selector);
    var heat = makeChart('概率分布', '颜色越深，该时段落在此概率区间的占比越高', 'heat');
    var legend = element('div', 'stats-heat-legend'); legend.appendChild(element('span', '', '少')); legend.appendChild(element('i')); legend.appendChild(element('span', '', '多')); heat.head.appendChild(legend);
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
    var tooltip = element('div', 'stats-tooltip'); tooltip.hidden = true; tooltip.setAttribute('aria-hidden', 'true');
    var tooltipTitle = element('strong'), tooltipValue = element('p'), tooltipExtra = element('p');
    tooltip.appendChild(tooltipTitle); tooltip.appendChild(tooltipValue); tooltip.appendChild(tooltipExtra); root.appendChild(tooltip);
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
      activeChart = chart;
      draw();
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
    }
    var unsubscribe = store.subscribe(render);
    function resized() { if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { frame = null; draw(); }); }
    var resize = typeof ResizeObserver === 'function' ? new ResizeObserver(resized) : null;
    if (resize) resize.observe(root); else window.addEventListener('resize', resized);
    render();
    return { destroy: function () { destroyed = true; unsubscribe(); if (resize) resize.disconnect(); else window.removeEventListener('resize', resized); if (frame) cancelAnimationFrame(frame); root.remove(); } };
  }
  window.AiraStatsPanel = { mount: mount };
})();
