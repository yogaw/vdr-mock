/* ============================================================
   SecureVDR mock — session, role guards, mock "authorization
   chain", API layer, event logging, UI helpers, smoke tests.

   MOCK SECURITY MODEL (see 04. MOCK-BRIEF.md §2):
   everything here runs in the browser and is a UI simulation.
   The 401/404/403 semantics mirror PRD §9.2 so flows can be
   designed now, but this is NOT enforcement of any kind.
   ============================================================ */

(function () {
  'use strict';

  var DB_KEY = 'vdr.db';
  var SESSION_KEY = 'vdr.session';
  var LOGIN_URL = '../login/index.html'; // file:// has no directory index — always target the page file

  /* ---------------- store ---------------- */

  VDR.store = {
    db: function () {
      try { return JSON.parse(localStorage.getItem(DB_KEY)) || null; }
      catch (e) { return null; }
    },
    save: function (db) {
      try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* mock: ignore */ }
    },
    update: function (fn) {
      var db = this.db();
      if (!db) return;
      fn(db);
      this.save(db);
    }
  };

  /* ---------------- utils ---------------- */

  VDR.utils = {
    // Page params travel in the URL fragment (#doc=...): Safari drops query
    // strings from file:// URLs, but fragments survive in every browser.
    // Falls back to search for any old-style links.
    qs: function (name) {
      var params = (location.hash && location.hash.length > 1)
        ? new URLSearchParams(location.hash.replace(/^#/, ''))
        : new URLSearchParams(location.search || '');
      return params.get(name);
    },
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    initials: function (name) {
      return String(name || '?').trim().split(/\s+/).slice(0, 2)
        .map(function (p) { return p[0].toUpperCase(); }).join('');
    },
    formatDate: function (iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    },
    formatDateTime: function (iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    },
    formatBytes: function (bytes) {
      if (bytes == null) return '—';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    },
    // Text-tile icons: colored chip carrying the format short-code.
    fileIcon: function (type) {
      var map = {
        pdf:  { label: 'PDF', cls: 'ft-pdf'  },
        docx: { label: 'DOC', cls: 'ft-docx' },
        xlsx: { label: 'XLS', cls: 'ft-xlsx' },
        pptx: { label: 'PPT', cls: 'ft-pptx' }
      };
      return map[type] || { label: 'FILE', cls: '' };
    },
    // Minimal inline SVG marks for empty/error states; stroke inherits color.
    stateIcon: function (kind) {
      var paths = {
        lock:     '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
        folder:   '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        blocked:  '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
        document: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 16h5"/>'
      };
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (paths[kind] || paths.document) + '</svg>';
    }
  };

  // Declarative state icons: <div class="ic" data-icon="lock|folder|blocked|document"></div>
  document.querySelectorAll('.ic[data-icon]').forEach(function (el) {
    el.innerHTML = VDR.utils.stateIcon(el.getAttribute('data-icon'));
  });

  /* ---------------- session ---------------- */

  VDR.session = {
    TIMEOUT_MIN: 30, // FR-AUTH-4 idle timeout (mock: checked on navigation/interaction)

    _read: function () {
      try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
      catch (e) { return null; }
    },
    _write: function (s) {
      try {
        if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        else localStorage.removeItem(SESSION_KEY);
      } catch (e) { /* mock: ignore */ }
    },
    current: function () {
      var s = this._read();
      if (!s) return null;
      var idleMs = Date.now() - (s.lastActive || s.startedAt || 0);
      if (idleMs > this.TIMEOUT_MIN * 60000) {
        this._write(null); // idle-expired: session gone (FR-AUTH-4)
        return null;
      }
      return s;
    },
    touch: function () {
      var s = this._read();
      if (s) { s.lastActive = Date.now(); this._write(s); }
    },
    login: function (userId) {
      this._write({ userId: userId, startedAt: Date.now(), lastActive: Date.now() });
    },
    logout: function () {
      this._write(null);
    },
    user: function () {
      var s = this.current();
      if (!s) return null;
      var db = VDR.store.db();
      if (!db) return null;
      var u = db.users.find(function (x) { return x.id === s.userId; });
      return (u && u.status === 'active') ? u : null;
    },
    // Pure credential check — no side effects (mock: plaintext per MOCK-BRIEF).
    authenticate: function (email, password) {
      var db = VDR.store.db();
      if (!db) return null;
      var u = db.users.find(function (x) {
        return x.status === 'active' && x.email.toLowerCase() === String(email || '').trim().toLowerCase();
      });
      return (u && u.password === password) ? u : null;
    },
    // Role guard (story 1.3). Redirects and returns null when not allowed.
    requireRole: function (role) {
      var s = this.current();
      if (!s) { location.href = LOGIN_URL; return null; }
      var user = this.user();
      if (!user) { this._write(null); location.href = LOGIN_URL; return null; }
      if (role && user.role !== role) { location.href = '../rooms/index.html'; return null; }
      this.touch();
      return user;
    }
  };

  /* ---------------- mock "authorization chain" (PRD §9.2) ---------------- */

  function grantValid(g) {
    if (!g || g.revoked_at) return false;
    if (g.expires_at && new Date(g.expires_at).getTime() < Date.now()) return false;
    return true;
  }

  // Client payloads never include server-side storage references (NFR-SEC-2 simulation).
  function sanitizeDoc(d) {
    var copy = Object.assign({}, d);
    delete copy.storage_key;
    return copy;
  }

  VDR.chain = {
    roomAccess: function (user, roomId) {
      if (!user) return false;
      if (user.role === 'admin') return true; // PRD §4.2: admin sees all rooms
      var db = VDR.store.db();
      if (!db) return false;
      return db.grants.some(function (g) {
        return g.user_id === user.id && g.room_id === roomId && grantValid(g);
      });
    },
    // identity -> room access -> document permission
    // 401 no session · 404 no doc / no room access (no existence leak, NFR-SEC-7) · 403 doc-level denial
    document: function (user, docId) {
      if (!user) return { status: 401 };
      var db = VDR.store.db();
      if (!db) return { status: 404 };
      var doc = db.documents.find(function (d) { return d.id === docId && !d.deleted_at; });
      if (!doc) return { status: 404 };
      var room = db.rooms.find(function (r) { return r.id === doc.room_id && !r.deleted_at; });
      if (!room) return { status: 404 };
      if (!this.roomAccess(user, room.id)) return { status: 404 };
      if (user.role !== 'admin' && doc.access_enabled === false) return { status: 403 };
      var folder = db.folders.find(function (f) { return f.id === doc.folder_id; }) || null;
      return { status: 200, doc: sanitizeDoc(doc), room: room, folder: folder };
    }
  };

  /* ---------------- activity log (story 1.7) ---------------- */

  VDR.logEvent = function (type, detail, actorId) {
    var s = VDR.session.current();
    var uid = actorId != null ? actorId : (s ? s.userId : null);
    if (uid == null) return;
    VDR.store.update(function (db) {
      db.events.unshift({
        id: 'e-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        user_id: uid,
        event_type: type,
        room_id: (detail && detail.room_id) || null,
        document_id: (detail && detail.document_id) || null,
        ip: '203.0.113.' + (10 + Math.floor(Math.random() * 240)), // mock IP
        user_agent: navigator.userAgent.slice(0, 120),
        detail: (detail && detail.note) || '',
        created_at: new Date().toISOString()
      });
      db.events = db.events.slice(0, 500);
    });
  };

  /* ---------------- API layer (mock) ---------------- */

  VDR.api = {
    listRooms: function (user) {
      var db = VDR.store.db();
      if (!db || !user) return [];
      var rooms = db.rooms.filter(function (r) { return !r.deleted_at; });
      var self = this;
      if (user.role === 'admin') {
        return rooms.map(function (r) { return self._roomView(db, r, null); });
      }
      return db.grants
        .filter(function (g) { return g.user_id === user.id && grantValid(g); })
        .map(function (g) {
          var room = rooms.find(function (r) { return r.id === g.room_id; });
          return room ? self._roomView(db, room, g.expires_at) : null;
        })
        .filter(Boolean);
    },
    _roomView: function (db, room, expiresAt) {
      var docs = db.documents.filter(function (d) { return d.room_id === room.id && !d.deleted_at; });
      var updated = docs.reduce(function (m, d) {
        return d.updated_at > m ? d.updated_at : m;
      }, room.created_at);
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        expiresAt: expiresAt,
        docCount: docs.length,
        folderCount: db.folders.filter(function (f) { return f.room_id === room.id; }).length,
        updated: updated
      };
    },
    getRoom: function (user, roomId) {
      var db = VDR.store.db();
      if (!db || !user) return { status: 404 };
      var room = db.rooms.find(function (r) { return r.id === roomId && !r.deleted_at; });
      if (!room) return { status: 404 };
      var expiresAt = null;
      if (user.role !== 'admin') {
        var g = db.grants.find(function (x) { return x.user_id === user.id && x.room_id === roomId; });
        if (!grantValid(g)) return { status: 404 };
        expiresAt = g.expires_at;
      }
      return {
        status: 200,
        room: room,
        expiresAt: expiresAt,
        folders: db.folders.filter(function (f) { return f.room_id === roomId; }),
        docs: db.documents
          .filter(function (d) { return d.room_id === roomId && !d.deleted_at; })
          .map(sanitizeDoc)
          .sort(function (a, b) { return a.name.localeCompare(b.name); })
      };
    },
    // Runs the chain; logs a view event on success (story 1.7).
    openDocument: function (docId) {
      var user = VDR.session.user();
      var res = VDR.chain.document(user, docId);
      if (res.status === 200) {
        VDR.logEvent('view', { room_id: res.doc.room_id, document_id: res.doc.id });
      }
      return res;
    }
  };

  /* ---------------- UI helpers ---------------- */

  VDR.toast = function (message, kind) {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' t-' + kind : '');
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  };

  VDR.renderTopbar = function (user, active) {
    var bar = document.getElementById('vdr-topbar');
    if (!bar || !user) return;
    var e = VDR.utils.esc;
    var nav = '<div class="topbar-nav"><a href="../rooms/index.html"' +
      (active === 'rooms' ? ' class="active"' : '') + '>Rooms</a></div>';
    var roleBadge = user.role === 'admin'
      ? '<span class="badge badge-primary">Admin</span>'
      : '<span class="badge badge-neutral">Viewer</span>';
    bar.innerHTML =
      '<div class="topbar-inner">' +
        '<a class="brand" href="../rooms/index.html"><span class="brand-mark">SV</span>SecureVDR</a>' +
        nav +
        '<div class="topbar-spacer"></div>' +
        roleBadge +
        '<div class="user-chip">' +
          '<div class="who"><div class="name">' + e(user.name) + '</div><div class="email">' + e(user.email) + '</div></div>' +
          '<div class="avatar">' + e(VDR.utils.initials(user.name)) + '</div>' +
        '</div>' +
        '<button class="btn btn-ghost btn-sm" id="vdr-logout-btn">Sign out</button>' +
      '</div>';
    bar.querySelector('#vdr-logout-btn').addEventListener('click', function () {
      VDR.logEvent('logout', {});
      VDR.session.logout();
      location.href = LOGIN_URL;
    });
  };

  // Standard page bootstrap: guard role, render topbar, keep session "active".
  VDR.initPage = function (opts) {
    opts = opts || {};
    var user = VDR.session.requireRole(opts.role);
    if (!user) return null; // redirecting
    document.addEventListener('click', function () { VDR.session.touch(); });
    document.addEventListener('keydown', function () { VDR.session.touch(); });
    VDR.renderTopbar(user, opts.active || '');
    return user;
  };

  /* ---------------- smoke tests (story 1.8, §12.2 subset) ---------------- */

  VDR.runSmokeTests = function () {
    var results = [];
    var savedSession = localStorage.getItem(SESSION_KEY);

    function t(name, fn) {
      try {
        var r = fn();
        results.push({ test: name, pass: !!r.pass, info: r.info || '' });
      } catch (e) {
        results.push({ test: name, pass: false, info: 'threw: ' + e.message });
      }
    }
    function withSession(userId, fn) {
      VDR.session._write(userId ? { userId: userId, startedAt: Date.now(), lastActive: Date.now() } : null);
      return fn();
    }
    function openAs(userId, docId) {
      return withSession(userId, function () {
        return VDR.api.openDocument(docId);
      });
    }

    t('unauthenticated document open -> 401', function () {
      var r = openAs(null, 'd-aurora-nda');
      return { pass: r.status === 401, info: 'status ' + r.status };
    });
    t('viewer without grant -> 404 (no existence leak)', function () {
      var r = openAs('u-viewer', 'd-bolt-notes');
      return { pass: r.status === 404, info: 'status ' + r.status };
    });
    t('expired grant -> 404', function () {
      var r = openAs('u-expired', 'd-aurora-nda');
      return { pass: r.status === 404, info: 'status ' + r.status };
    });
    t('revoked grant -> 404', function () {
      var r = openAs('u-revoked', 'd-aurora-nda');
      return { pass: r.status === 404, info: 'status ' + r.status };
    });
    t('granted viewer -> 200 with document', function () {
      var r = openAs('u-viewer', 'd-aurora-nda');
      return { pass: r.status === 200 && !!r.doc && r.doc.id === 'd-aurora-nda', info: 'status ' + r.status };
    });
    t('successful open appends a view event', function () {
      var before = VDR.store.db().events.length;
      openAs('u-viewer', 'd-aurora-nda');
      var after = VDR.store.db().events.length;
      return { pass: after === before + 1, info: before + ' -> ' + after };
    });
    t('client payload exposes no storage_key', function () {
      var r = openAs('u-viewer', 'd-aurora-nda');
      var leaked = r.doc && ('storage_key' in r.doc);
      return { pass: r.status === 200 && !leaked, info: leaked ? 'storage_key present!' : 'clean' };
    });
    t('admin can open documents in any room -> 200', function () {
      var r = openAs('u-admin', 'd-bolt-notes');
      return { pass: r.status === 200, info: 'status ' + r.status };
    });
    t('authenticate rejects wrong password', function () {
      var u = VDR.session.authenticate('viewer@vdr.test', 'wrong');
      return { pass: u === null, info: u ? 'accepted!' : 'rejected' };
    });
    t('authenticate accepts demo viewer', function () {
      var u = VDR.session.authenticate('viewer@vdr.test', 'viewer123');
      return { pass: !!u && u.role === 'viewer', info: u ? u.name : 'rejected' };
    });

    // restore whatever session state existed before the run
    try {
      if (savedSession === null) localStorage.removeItem(SESSION_KEY);
      else localStorage.setItem(SESSION_KEY, savedSession);
    } catch (e) { /* mock: ignore */ }

    return results;
  };
})();
