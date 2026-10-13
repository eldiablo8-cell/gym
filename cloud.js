// ZAMPA'S GYM - sincronizzazione online (Firebase Authentication + Firestore)
// Se qualcosa non va (offline, regole non impostate) l'app continua a funzionare con i dati salvati sul dispositivo.

const firebaseConfig = {
  apiKey: "AIzaSyDk8F4m-ifmfxj4AZHyzodIQYL-9Bhla8M",
  authDomain: "zampa-s-gym.firebaseapp.com",
  projectId: "zampa-s-gym",
  storageBucket: "zampa-s-gym.firebasestorage.app",
  messagingSenderId: "1019968160648",
  appId: "1:1019968160648:web:9d6bc6b4d19f1c5ffe703d"
};

const BASE = 'https://www.gstatic.com/firebasejs/10.12.2/';
const $ = id => document.getElementById(id);
const btn = $('cl'), ov = $('lg');
const setState = (t, tip) => { btn.textContent = t; btn.title = tip || 'Sincronizzazione online'; };
window.cloud = { mark() {}, pushAll() {} };

async function main() {
  let A, Au, F;
  try {
    [A, Au, F] = await Promise.all([
      import(BASE + 'firebase-app.js'),
      import(BASE + 'firebase-auth.js'),
      import(BASE + 'firebase-firestore.js')
    ]);
  } catch (e) { setState('☁ ✕', 'Sincronizzazione non disponibile (nessuna connessione?)'); return; }

  const app = A.initializeApp(firebaseConfig), auth = Au.getAuth(app);
  let fs;
  try { fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch (e) { fs = F.getFirestore(app); }

  const enc = encodeURIComponent;
  let uid = null, unsubs = [], dirty = new Map(), timer = 0, skipped = false, pending = false, warned = false;
  let merged = { d: false, p: false, l: false }, lastLib = '[]';
  const col = n => F.collection(fs, 'users', uid, n);
  const clean = v => JSON.parse(JSON.stringify(v));
  const key = (t, a, x) => JSON.stringify([t, a, String(x)]);
  const sched = () => { clearTimeout(timer); timer = setTimeout(flush, 900); setState('☁ …', 'Salvataggio in corso…'); };

  // ---- scrittura (con ritardo, per non inviare ogni tasto premuto) ----
  window.cloud = {
    mark() {
      if (!uid) return;
      if (st.ath) dirty.set(key(st.view === 'plan' ? 'p' : 'd', st.ath, st.view === 'plan' ? st.pd : st.date), 1);
      if (JSON.stringify(db.lib || []) !== lastLib) dirty.set('l', 1);
      if (dirty.size) sched();
    },
    pushAll() {
      if (!uid) return;
      Object.keys(db.athletes).forEach(a => Object.keys(db.athletes[a]).forEach(d => dirty.set(key('d', a, d), 1)));
      Object.keys(db.plans || {}).forEach(a => Object.keys(db.plans[a]).forEach(w => dirty.set(key('p', a, w), 1)));
      dirty.set('l', 1); sched();
    }
  };

  async function flush() {
    timer = 0;
    if (!uid || !dirty.size) return;
    const keys = [...dirty.keys()]; dirty.clear();
    try {
      for (let i = 0; i < keys.length; i += 400) {
        const b = F.writeBatch(fs);
        keys.slice(i, i + 400).forEach(k => {
          if (k === 'l') { b.set(F.doc(col('meta'), 'lib'), { lib: clean(db.lib || []) }); return; }
          const [t, a, x] = JSON.parse(k);
          if (t === 'd') {
            const g = (db.athletes[a] || {})[x], r = F.doc(col('days'), enc(a) + '|' + x);
            g && g.length ? b.set(r, { ath: a, date: x, groups: clean(g) }) : b.delete(r);
          } else {
            const g = ((db.plans || {})[a] || {})[x], r = F.doc(col('plans'), enc(a) + '|' + x);
            g && g.length ? b.set(r, { ath: a, wd: Number(x), groups: clean(g) }) : b.delete(r);
          }
        });
        await b.commit();
      }
      lastLib = JSON.stringify(db.lib || []);
      if (!dirty.size) setState('☁ ✓', 'Sincronizzato');
    } catch (e) {
      keys.forEach(k => dirty.set(k, 1));
      setState('☁ !', 'Errore di salvataggio: ' + (e.code || e.message));
    }
  }

  // ---- lettura (aggiornamenti in tempo reale dagli altri dispositivi) ----
  function refresh() {
    const a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { pending = true; return; }
    if (!st.ath) { const k = Object.keys(db.athletes); if (k.length) st.ath = k[0]; }
    render();
  }
  document.addEventListener('focusout', () => {
    if (!pending) return;
    setTimeout(() => {
      const a = document.activeElement;
      if (pending && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { pending = false; refresh(); }
    }, 300);
  });
  function done(ch, fromCache) {
    if (ch) { save(true); refresh(); }
    if (!dirty.size) setState(fromCache ? '☁ offline' : '☁ ✓', fromCache ? 'Offline: i dati si sincronizzeranno al ritorno della connessione' : 'Sincronizzato');
  }
  function onErr(e) {
    setState('☁ !', 'Errore: ' + (e.code || e.message));
    if (e.code === 'permission-denied' && !warned) { warned = true; alert('Firestore ha negato l\'accesso: controlla di aver incollato le regole di sicurezza.'); }
  }

  function applyDays(snap) {
    let ch = false;
    snap.docChanges().forEach(c => {
      if (c.doc.metadata.hasPendingWrites) return;
      const d = c.doc.data();
      if (c.type === 'removed') {
        if (db.athletes[d.ath] && db.athletes[d.ath][d.date]) { delete db.athletes[d.ath][d.date]; ch = true; }
      } else {
        const o = db.athletes[d.ath] = db.athletes[d.ath] || {};
        if (JSON.stringify(o[d.date]) !== JSON.stringify(d.groups)) { o[d.date] = d.groups; ch = true; }
      }
    });
    if (!merged.d && !snap.metadata.fromCache) {   // primo accesso: carica online i dati che esistono solo su questo dispositivo
      merged.d = true;
      const ids = new Set(snap.docs.map(x => x.id));
      Object.keys(db.athletes).forEach(a => Object.keys(db.athletes[a]).forEach(dt => {
        const g = db.athletes[a][dt];
        if (g && g.length && !ids.has(enc(a) + '|' + dt)) dirty.set(key('d', a, dt), 1);
      }));
      if (dirty.size) sched();
    }
    done(ch, snap.metadata.fromCache);
  }

  function applyPlans(snap) {
    let ch = false;
    db.plans = db.plans || {};
    snap.docChanges().forEach(c => {
      if (c.doc.metadata.hasPendingWrites) return;
      const d = c.doc.data();
      if (c.type === 'removed') {
        if (db.plans[d.ath] && db.plans[d.ath][d.wd]) { delete db.plans[d.ath][d.wd]; ch = true; }
      } else {
        const o = db.plans[d.ath] = db.plans[d.ath] || {};
        if (JSON.stringify(o[d.wd]) !== JSON.stringify(d.groups)) { o[d.wd] = d.groups; ch = true; }
      }
    });
    if (!merged.p && !snap.metadata.fromCache) {
      merged.p = true;
      const ids = new Set(snap.docs.map(x => x.id));
      Object.keys(db.plans).forEach(a => Object.keys(db.plans[a]).forEach(w => {
        const g = db.plans[a][w];
        if (g && g.length && !ids.has(enc(a) + '|' + w)) dirty.set(key('p', a, w), 1);
      }));
      if (dirty.size) sched();
    }
    done(ch, snap.metadata.fromCache);
  }

  function applyLib(snap) {
    if (snap.metadata.hasPendingWrites) return;
    const r = snap.exists() ? (snap.data().lib || []) : [];
    let l = r.slice();
    if (!merged.l && !snap.metadata.fromCache) {
      merged.l = true;
      (db.lib || []).forEach(x => { if (!l.some(y => nm(y) === nm(x))) l.push(x); });
      if (l.length !== r.length) { dirty.set('l', 1); sched(); }
    }
    const ch = JSON.stringify(l) !== JSON.stringify(db.lib || []);
    if (ch) db.lib = l;
    lastLib = JSON.stringify(r);
    done(ch, snap.metadata.fromCache);
  }

  // ---- accesso ----
  Au.onAuthStateChanged(auth, u => {
    unsubs.forEach(f => f()); unsubs = [];
    merged = { d: false, p: false, l: false };
    if (!u) { uid = null; setState('☁ Accedi', 'Non connesso: tocca per accedere'); ov.hidden = skipped; return; }
    uid = u.uid; ov.hidden = true; setState('☁ …', 'Connessione…');
    unsubs.push(
      F.onSnapshot(col('days'), applyDays, onErr),
      F.onSnapshot(col('plans'), applyPlans, onErr),
      F.onSnapshot(F.doc(col('meta'), 'lib'), applyLib, onErr)
    );
  });

  const msg = e => {
    const c = e.code || '';
    return /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? 'Email o password non corrette'
      : /network/.test(c) ? 'Nessuna connessione'
      : /too-many/.test(c) ? 'Troppi tentativi, riprova tra poco'
      : 'Errore: ' + (c || e.message);
  };
  $('lgf').onsubmit = async ev => {
    ev.preventDefault(); $('lge').textContent = '';
    try { await Au.signInWithEmailAndPassword(auth, $('lgm').value.trim(), $('lgp').value); $('lgp').value = ''; }
    catch (e) { $('lge').textContent = msg(e); }
  };
  $('lgs').onclick = () => { skipped = true; ov.hidden = true; };
  btn.onclick = () => {
    if (uid) { if (confirm('Uscire dall\'account? I dati restano salvati online.')) Au.signOut(auth); }
    else { skipped = false; ov.hidden = false; }
  };
}
main();
