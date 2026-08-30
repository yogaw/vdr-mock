/* login — session entry point (story 1.2). Also hosts the smoke-test
   suite via ?selftest=1 (story 1.8). */
(function () {
  'use strict';

  var form = document.getElementById('login-form');
  var emailInput = document.getElementById('email');
  var passwordInput = document.getElementById('password');
  var errorBox = document.getElementById('form-error');
  var loginBtn = document.getElementById('login-btn');

  // Shows which mock build is actually running — if this doesn't read it1-v4,
  // the browser is serving cached scripts (do an empty-cache hard reload).
  document.getElementById('mock-ver').textContent = 'v' + VDR.MOCK_VERSION;

  // Already signed in -> straight to rooms.
  if (VDR.session.user()) {
    location.href = '../rooms/index.html';
    return;
  }

  // Demo chips prefill the form.
  document.querySelectorAll('.demo-chips .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      emailInput.value = chip.dataset.email;
      passwordInput.value = chip.dataset.password;
      errorBox.hidden = true;
      emailInput.focus();
    });
  });

  // Escape hatch: wipes stored demo state and reseeds on reload.
  document.getElementById('reset-data').addEventListener('click', function (ev) {
    ev.preventDefault();
    try {
      localStorage.removeItem('vdr.db');
      localStorage.removeItem('vdr.session');
    } catch (e) { /* mock: ignore */ }
    location.reload();
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    errorBox.hidden = true;

    var email = emailInput.value.trim();
    var password = passwordInput.value;

    if (!email || !password) {
      showError('Enter your email and password.');
      return;
    }

    loginBtn.disabled = true;
    setTimeout(function () {  // brief fake latency so the loading state is visible
      loginBtn.disabled = false;
      var user = VDR.session.authenticate(email, password);
      if (!user) {
        // log failed attempts only for known accounts (keeps event noise low)
        var db = VDR.store.db();
        var known = db.users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
        if (known) {
          VDR.store.update(function (d) {
            d.events.unshift({
              id: 'e-' + Date.now(), user_id: null, event_type: 'login_failed',
              room_id: null, document_id: null, ip: '203.0.113.99',
              user_agent: navigator.userAgent.slice(0, 120),
              detail: 'failed sign-in as ' + email, created_at: new Date().toISOString()
            });
          });
        }
        showError('Invalid email or password.');
        var card = document.querySelector('.auth-card');
        card.classList.remove('shake');
        void card.offsetWidth; // restart animation
        card.classList.add('shake');
        return;
      }
      VDR.session.login(user.id);
      VDR.logEvent('login', {});
      location.href = '../rooms/index.html';
    }, 350);
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }

  // Smoke tests (story 1.8): open login/?selftest=1
  if (VDR.utils.qs('selftest') === '1') {
    setTimeout(function () {
      var results = VDR.runSmokeTests();
      var passed = results.filter(function (r) { return r.pass; }).length;
      console.group('%cVDR mock — Iteration 1 smoke tests (' + passed + '/' + results.length + ' passed)', 'font-weight:bold');
      console.table(results);
      console.groupEnd();
      VDR.toast('Smoke tests: ' + passed + '/' + results.length + ' passed',
        passed === results.length ? 'success' : 'error');
    }, 200);
  }
})();
