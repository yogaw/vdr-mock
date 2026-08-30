/* rooms — viewer home / admin room list (story 1.6).
   Viewer sees only granted, non-expired, non-revoked rooms (FR-ACC-3/4/5). */
(function () {
  'use strict';

  var user = VDR.initPage({ active: 'rooms' });
  if (!user) return; // redirecting to login

  var e = VDR.utils.esc;
  var rooms = VDR.api.listRooms(user);

  renderGreeting(user);
  renderGrid(rooms);
  renderExpiryNote(user);

  function renderGreeting(user) {
    var h = new Date().getHours();
    var part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('greeting').textContent = part + ', ' + user.name.split(' ')[0];
    document.getElementById('greeting-sub').textContent = user.role === 'admin'
      ? 'All data rooms. You manage rooms, documents, and access.'
      : 'Data rooms shared with you. All activity is logged.';
  }

  function renderGrid(rooms) {
    var grid = document.getElementById('rooms-grid');
    var empty = document.getElementById('empty-state');
    if (!rooms.length) {
      grid.hidden = true;
      empty.hidden = false;
      return;
    }
    grid.innerHTML = rooms.map(function (r) {
      var badge = user.role === 'admin'
        ? '<span class="badge badge-primary">Admin</span>'
        : '<span class="badge badge-warn">Access expires ' + e(VDR.utils.formatDate(r.expiresAt)) + '</span>';
      return (
        '<a class="card room-card" href="../room-detail/index.html#room=' + encodeURIComponent(r.id) + '">' +
          '<div class="rc-top"><h2>' + e(r.name) + '</h2>' + badge + '</div>' +
          '<div class="rc-desc">' + e(r.description || '') + '</div>' +
          '<div class="rc-meta">' +
            '<span>' + r.docCount + ' document' + (r.docCount === 1 ? '' : 's') + '</span>' +
            '<span>' + r.folderCount + ' folder' + (r.folderCount === 1 ? '' : 's') + '</span>' +
            '<span>Updated ' + e(VDR.utils.formatDate(r.updated)) + '</span>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  // Helpful hint when the viewer *had* access that has since lapsed (rooms stay hidden per PRD).
  function renderExpiryNote(user) {
    if (user.role === 'admin' || !rooms.length) return;
    var db = VDR.store.db();
    var lapsed = db.grants.filter(function (g) {
      if (g.user_id !== user.id) return false;
      var revoked = !!g.revoked_at;
      var expired = g.expires_at && new Date(g.expires_at).getTime() < Date.now();
      return revoked || expired;
    });
    if (!lapsed.length) return;
    var note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Access to ' + lapsed.length + ' room' + (lapsed.length === 1 ? '' : 's') +
      ' has expired or been revoked. Contact your administrator to restore access.';
    document.querySelector('.container').appendChild(note);
  }
})();
