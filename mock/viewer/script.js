/* viewer — secure in-app document viewer (stories 1.6/1.7).
   Runs the mock authorization chain before rendering:
   401 -> login redirect · 404/403 -> inline denied state · 200 -> render.
   A successful open appends a view event (story 1.7).
   Watermark + download control arrive in Iteration 2. */
(function () {
  'use strict';

  var user = VDR.initPage({ active: 'rooms' });
  if (!user) return;

  var docId = VDR.utils.qs('doc');
  var res = docId ? VDR.api.openDocument(docId) : { status: 404 };

  if (res.status === 401) {
    location.href = '../login/index.html';
    return;
  }
  if (res.status !== 200) {
    showDenied(res.status);
    return;
  }

  render(res);

  function render(res) {
    var e = VDR.utils.esc;
    var doc = res.doc;
    var room = res.room;

    document.title = doc.name + ' · SecureVDR';
    document.getElementById('viewer-shell').hidden = false;

    document.getElementById('doc-name').textContent = doc.name;

    var metaBits = [];
    if (doc.pages) metaBits.push(doc.pages + ' pages');
    metaBits.push('v' + doc.version);
    metaBits.push(VDR.utils.formatBytes(doc.size_bytes));
    metaBits.push('Updated ' + VDR.utils.formatDate(doc.updated_at));
    document.getElementById('doc-meta').textContent = metaBits.join(' · ');

    var roomBadge = document.getElementById('doc-room-badge');
    roomBadge.textContent = room.name;

    document.getElementById('back-link').href =
      '../room-detail/index.html#room=' + encodeURIComponent(room.id);

    document.getElementById('viewer-chip').innerHTML =
      '<span class="avatar">' + e(VDR.utils.initials(user.name)) + '</span>' +
      '<span><span class="vc-name">' + e(user.name) + '</span> ' +
      '<span class="vc-email">' + e(user.email) + '</span></span>';

    // Brief staged loading so the state is visible, then route by preview type.
    setTimeout(function () {
      document.getElementById('doc-loading').hidden = true;
      if (doc.preview) {
        renderOffice(doc);   // in-app HTML preview — plugin-free, works everywhere
      } else if (doc.file && doc.type === 'pdf') {
        renderPdf(doc);      // legacy path: browser PDF plugin over the real file
      } else {
        showNone(doc);
      }
    }, 500);
  }

  function showNone(doc) {
    var none = document.getElementById('preview-none');
    none.querySelector('h2').textContent =
      'Preview not available for .' + (doc.type || 'file');
    none.hidden = false;
    // Self-diagnosis line — shows exactly what the page did and did not receive.
    var db = VDR.store.db();
    document.getElementById('preview-debug').textContent =
      'doc ' + doc.id + ' · type ' + doc.type +
      ' · file ' + (doc.file ? 'yes' : 'no') +
      ' · preview data ' + (doc.preview ? 'yes' : 'no') +
      ' · demo data v' + (db ? db.__version : '?');
    if (doc.file) {
      var open = document.getElementById('open-tab');
      open.href = doc.file;
      open.hidden = false;
    }
    // Office doc without preview data is a stale-data signature: reseed and retry once.
    if (doc.file && doc.type !== 'pdf' && VDR.utils.qs('fr') !== '1') {
      try { localStorage.removeItem('vdr.db'); } catch (e) { /* mock: ignore */ }
      location.hash = 'doc=' + encodeURIComponent(doc.id) + '&fr=1';
      location.reload();
    }
  }

  function renderPdf(doc) {
    var host = document.getElementById('doc-content');
    // object > embed nest covers Chrome/Safari; the header button covers the rest.
    host.innerHTML =
      '<object data="' + VDR.utils.esc(doc.file) + '" type="application/pdf" aria-label="Document preview">' +
        '<embed src="' + VDR.utils.esc(doc.file) + '" type="application/pdf">' +
      '</object>';
    host.hidden = false;
    var open = document.getElementById('open-tab');
    open.href = doc.file;
    open.hidden = false;
  }

  // Plugin-free "conversion" preview: every format renders from seeded data.
  function renderOffice(doc) {
    var host = document.getElementById('doc-content');
    host.innerHTML = doc.preview.kind === 'sheet' ? sheetHtml(doc) : docHtml(doc);
    host.hidden = false;
    if (doc.file) {
      // Real file exists — serve it directly (PDFs display, office files download).
      var open = document.getElementById('open-tab');
      open.href = doc.file;
      open.hidden = false;
    }
  }

  function fmtCell(val, type) {
    if (val == null || val === '') return '';
    if (type === 'number') return Number(val).toLocaleString('en-US');
    if (type === 'currency') return '$' + Number(val).toFixed(2);
    if (type === 'percent') return (val * 100).toFixed(1) + '%';
    return VDR.utils.esc(val);
  }

  function sheetHtml(doc) {
    var p = doc.preview, e = VDR.utils.esc;
    var letters = 'ABCDEFGHIJ'.slice(0, p.columns.length).split('');
    var html = '<div class="sheet-shell">' +
      '<div class="sheet-bar"><span class="cell-ref">' + e(p.sheetName) + '!A1</span>' +
      '<span>' + e(doc.name) + ' — simulated conversion preview</span></div>' +
      '<div class="sheet-scroll"><table class="sheet"><thead>' +
      '<tr><th class="rowhead"></th>' +
        letters.map(function (l) { return '<th>' + l + '</th>'; }).join('') + '</tr>' +
      '<tr><th class="rowhead"></th>' +
        p.columns.map(function (c) { return '<th class="colname">' + e(c) + '</th>'; }).join('') + '</tr>' +
      '</thead><tbody>';
    p.rows.forEach(function (row, i) {
      var isTotal = String(row[0]).toUpperCase() === 'TOTAL';
      html += '<tr' + (isTotal ? ' class="total"' : '') + '><td class="rowhead">' + (i + 1) + '</td>';
      row.forEach(function (cell, c) {
        var type = p.colTypes[c];
        html += '<td' + (type !== 'text' ? ' class="num"' : '') + '>' +
          fmtCell(cell, type) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>' +
      '<div class="sheet-tabs">' + p.tabs.map(function (tab, i) {
        return '<span' + (i === 0 ? ' class="active"' : '') + '>' + e(tab) + '</span>';
      }).join('') + '</div></div>';
    return html;
  }

  function docHtml(doc) {
    var p = doc.preview, e = VDR.utils.esc;
    var body = p.blocks.map(function (b) {
      if (b.type === 'h') return '<h3>' + e(b.text) + '</h3>';
      if (b.type === 'ul') return '<ul>' + b.items.map(function (it) { return '<li>' + e(it) + '</li>'; }).join('') + '</ul>';
      if (b.type === 'sign') return '<p class="dp-sign">' + e(b.text) + '</p>';
      return '<p>' + e(b.text) + '</p>';
    }).join('');
    return '<div class="docpage-scroll"><div class="docpage">' +
      '<h2>' + e(p.title) + '</h2>' +
      '<p class="dp-sub">' + e(p.subtitle) + '</p>' +
      '<p class="dp-date">' + e(p.date) + '</p>' +
      body + '</div></div>';
  }

  function showDenied(status) {
    var title = document.getElementById('denied-title');
    var msg = document.getElementById('denied-msg');
    var ic = document.getElementById('denied-ic');
    if (status === 404) {
      // Same message for missing and not-granted — no existence leaks (NFR-SEC-7).
      ic.innerHTML = VDR.utils.stateIcon('lock');
      title.textContent = 'Document not available';
      msg.textContent = "This document doesn't exist, or your account doesn't have access to it. If you believe this is a mistake, contact your administrator.";
    } else {
      ic.innerHTML = VDR.utils.stateIcon('blocked');
      title.textContent = 'Access denied (' + status + ')';
      msg.textContent = 'You are not permitted to open this document.';
    }
    document.getElementById('denied-state').hidden = false;
  }
})();
