/* room-detail — folder browse + document list (story 1.6).
   Chain-checked: invalid room or lapsed access renders the error state. */
(function () {
  'use strict';

  var user = VDR.initPage({ active: 'rooms' });
  if (!user) return;

  var roomId = VDR.utils.qs('room');
  var folderId = VDR.utils.qs('folder'); // null/empty = all documents

  var res = roomId ? VDR.api.getRoom(user, roomId) : { status: 404 };
  if (res.status !== 200) {
    document.getElementById('error-state').hidden = false;
    return;
  }

  var e = VDR.utils.esc;
  var room = res.room;

  document.getElementById('room-layout').hidden = false;

  document.getElementById('breadcrumb').innerHTML =
    '<a href="../rooms/index.html">Rooms</a><span class="sep">/</span><span>' + e(room.name) + '</span>';

  document.getElementById('room-name').textContent = room.name;

  var sub = res.docs.length + ' document' + (res.docs.length === 1 ? '' : 's') +
    ' · ' + res.folders.length + ' folder' + (res.folders.length === 1 ? '' : 's');
  document.getElementById('room-sub').textContent = sub;

  var badges = [];
  if (user.role === 'admin') {
    badges.push('<span class="badge badge-primary">Admin</span>');
  } else if (res.expiresAt) {
    badges.push('<span class="badge badge-warn">Access expires ' + e(VDR.utils.formatDate(res.expiresAt)) + '</span>');
  }
  badges.push('<span class="badge badge-info">View-only</span>'); // download UI arrives in Iteration 2
  document.getElementById('room-badges').innerHTML = badges.join(' ');

  renderFolders(res.folders, res.docs);
  renderDocs(filterDocs(res.docs));

  function filterDocs(docs) {
    if (!folderId) return docs;
    return docs.filter(function (d) { return d.folder_id === folderId; });
  }

  function renderFolders(folders, docs) {
    var html = '<div class="fp-label">Folders</div>' +
      folderLink(null, 'All documents', docs.length) +
      folders.map(function (f) {
        var count = docs.filter(function (d) { return d.folder_id === f.id; }).length;
        return folderLink(f.id, f.name, count);
      }).join('');
    document.getElementById('folder-panel').innerHTML = html;
  }

  function folderLink(id, label, count) {
    var active = (folderId || null) === id ? ' active' : '';
    var href = '../room-detail/index.html#room=' + encodeURIComponent(roomId) + (id ? '&folder=' + encodeURIComponent(id) : '');
    return '<a class="folder-item' + active + '" href="' + href + '">' +
      '<span>' + e(label) + '</span><span class="count">' + count + '</span></a>';
  }

  function renderDocs(docs) {
    var tbody = document.getElementById('doc-rows');
    var empty = document.getElementById('folder-empty');
    if (!docs.length) {
      tbody.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    tbody.innerHTML = docs.map(function (d) {
      var ic = VDR.utils.fileIcon(d.type);
      var folder = res.folders.find(function (f) { return f.id === d.folder_id; });
      return (
        '<tr>' +
          '<td><div class="doc-name-cell">' +
            '<span class="file-ic ' + ic.cls + '">' + ic.label + '</span>' +
            '<div><div class="doc-title">' + e(d.name) + '</div>' +
            '<div class="doc-sub">' + e(folder ? folder.name : '—') + ' · v' + d.version + '</div></div>' +
          '</div></td>' +
          '<td class="col-updated">' + e(VDR.utils.formatDate(d.updated_at)) + '</td>' +
          '<td class="col-size">' + e(VDR.utils.formatBytes(d.size_bytes)) + '</td>' +
          '<td class="col-open"><a class="btn btn-secondary btn-sm" href="../viewer/index.html#doc=' + encodeURIComponent(d.id) + '">Open</a></td>' +
        '</tr>'
      );
    }).join('');
  }
})();
