/* diag — prints what this browser is actually running. No session needed. */
(function () {
  'use strict';

  var e = VDR.utils.esc;

  // --- probes -----------------------------------------------------------
  var storageOk = false, storageErr = '';
  try {
    localStorage.setItem('vdr.diag', '1');
    storageOk = localStorage.getItem('vdr.diag') === '1';
    localStorage.removeItem('vdr.diag');
  } catch (err) { storageErr = String(err && err.message || err); }

  var db = null;
  try { db = JSON.parse(localStorage.getItem('vdr.db') || 'null'); } catch (err) { /* unparseable */ }

  var healthy = !!(db && db.documents && db.documents.length &&
    db.documents.every(function (d) { return !!d.file && !!d.preview; }));

  var summary = [
    ['Code version (mock-data.js)', VDR.MOCK_VERSION || 'MISSING — old cached script'],
    ['Expected version', 'it1-v5'],
    ['This page was loaded from', location.href],
    ['Mock lives at', '/Users/yoga.wigardo/Workspaces/vdr-mock/mock/ — if the line above shows a different path, you are opening a different copy of the files'],
    ['localStorage', storageOk ? 'available' : 'UNAVAILABLE — ' + storageErr],
    ['Stored demo data', db ? 'v' + (db.__version || 'unknown') + (healthy ? ' (healthy)' : ' (STALE — will reseed on next page load)') : 'none yet'],
    ['Documents in stored data', db && db.documents ? String(db.documents.length) : '0'],
    ['Browser', navigator.userAgent]
  ];

  document.getElementById('summary').innerHTML = summary.map(function (r) {
    return '<tr><td>' + e(r[0]) + '</td><td>' + e(r[1]) + '</td></tr>';
  }).join('');

  // --- per-document -----------------------------------------------------
  var fakeViewer = { id: 'u-viewer', role: 'viewer' };
  var docs = (db && db.documents) || [];
  document.getElementById('rows').innerHTML = docs.map(function (d) {
    var res = VDR.chain.document(fakeViewer, d.id);
    var renderAs = d.preview
      ? ('in-app ' + d.preview.kind + ' preview')
      : (d.file && d.type === 'pdf' ? 'PDF plugin (legacy path)' : 'NOTHING — fallback state');
    return '<tr>' +
      '<td><div class="doc-name-cell"><span class="file-ic ' + VDR.utils.fileIcon(d.type).cls + '">' +
        VDR.utils.fileIcon(d.type).label + '</span><div class="doc-title">' + e(d.name) + '</div></div></td>' +
      '<td>' + e(d.type || '?') + '</td>' +
      '<td>' + (d.file ? '<span class="badge badge-success badge-mono">' + e(d.file) + '</span>' : '<span class="badge badge-danger">missing</span>') + '</td>' +
      '<td>' + (d.preview ? '<span class="badge badge-success">' + e(d.preview.kind) + '</span>' : '<span class="badge badge-danger">missing</span>') + '</td>' +
      '<td>' + (res.status === 200 ? '<span class="badge badge-success">yes (' + res.status + ')</span>' :
                res.status === 404 ? '<span class="badge badge-warn">no grant (' + res.status + ')</span>' :
                '<span class="badge badge-danger">' + res.status + '</span>') + '</td>' +
      '<td>' + e(renderAs) + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="6">No documents in stored data — open any page once, then reload here.</td></tr>';
})();
