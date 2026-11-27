const LOGO_DIA = 'libritol.png';
const LOGO_NOCHE = 'libritos1.png';
let intervaloVerificacion = null;
let currentMode = 'login';

// ESTADO GENERAL DE LA APLICACIÓN
let appState = {
  points: 0,
  libritos: 0,
  stars: 5,
  selectedRewardCost: 0,
  user: {
    username: 'Usuario',
    email: '',
    role: 'Tutor / Ayudante',
    year: '1.º Año',
    orientation: 'General',
    status: 'online',
    goodSubjects: [],
    badSubjects: [],
    goodDesc: '',
    badDesc: ''
  }
};

// BANCO DE USUARIOS PARA SOCIAL (PERSISTE LAS CUENTAS REGISTRADAS)
let communityUsers = [];

// LISTA DE RECOMPENSAS / PREMIOS
const rewardCatalog = [
  {
    id: 1,
    title: "Fotocopias Gratis x10",
    costPts: 1000,
    costLibritos: 1,
    desc: "Cuponera para imprimir material escolar en la librería del colegio.",
    img: "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: 2,
    title: "Descuento en Cantina",
    costPts: 2000,
    costLibritos: 2,
    desc: "Vale por un snack o bebida en el recreo de la cooperadora.",
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: 3,
    title: "Punto Extra en Trabajo",
    costPts: 5000,
    costLibritos: 5,
    desc: "Beneficio académico para presentar en la materia que elijas.",
    img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80"
  }
];

// CONTROL DE VISTAS
function mostrarVista(idVista) {
  const vistas = ['auth-view', 'profile-setup-view', 'dashboard-view'];
  vistas.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const target = document.getElementById(idVista);
  if (target) {
    if (idVista === 'dashboard-view') {
      target.style.display = 'block';
    } else {
      target.style.display = 'flex';
    }
  }
}

function showProfileSetup() {
  mostrarVista('profile-setup-view');
}

async function showDashboard(nombreUsuario) {
  mostrarVista('dashboard-view');
  if (nombreUsuario) {
    appState.user.username = nombreUsuario;
  }
  updateProfileUI();
  renderRewardsCatalog();
  restaurarPestana();
  await cargarComunidadDesdeFirestore();
}

// Vuelve a la pestaña en la que estaba la persona antes de recargar
function restaurarPestana() {
  let tabId = null;
  try { tabId = sessionStorage.getItem('libritos_tab'); } catch (e) {}
  if (!tabId || !document.getElementById(tabId)) return;
  const btn = document.querySelector(`.nav-item[onclick*="'${tabId}'"]`);
  switchTab(tabId, btn);

  if (tabId === 'view-social') {
    let sec = null;
    try { sec = sessionStorage.getItem('libritos_social'); } catch (e) {}
    if (sec === 'apuntes') cambiarSeccionSocial('apuntes');
  }
}

// MANTENER LA SESIÓN AL RECARGAR (REFRESH)
let sesionResuelta = false;

function mostrarLoginSiCorresponde() {
  if (sesionResuelta) return;
  sesionResuelta = true;
  mostrarVista('auth-view');
}

async function restaurarSesion() {
  if (!window.auth || !window.onAuthStateChanged) {
    mostrarLoginSiCorresponde();
    return;
  }

  // Solo se usa la primera respuesta: el login normal ya lo maneja handleSubmit
  const cancelar = window.onAuthStateChanged(window.auth, async (user) => {
    cancelar();
    if (sesionResuelta) return;

    if (user && user.emailVerified) {
      sesionResuelta = true;
      try {
        await continuarTrasLogin(user);
      } catch (error) {
        console.error('Error al restaurar la sesión:', error);
        sesionResuelta = false;
        mostrarLoginSiCorresponde();
      }
    } else {
      mostrarLoginSiCorresponde();
    }
  });
}

// Si Firebase no carga (sin internet), mostrar el login igual
setTimeout(mostrarLoginSiCorresponde, 5000);

function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const logoImg = document.getElementById('app-logo');
  const dashLogoImg = document.getElementById('dash-logo');
  const isDark = body.classList.contains('theme-dark');
  const faviconImg = document.getElementById('app-favicon');

  if (isDark) {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    if (themeIcon) themeIcon.className = 'ri-moon-fill';
    if (logoImg) logoImg.src = LOGO_DIA;
    if (dashLogoImg) dashLogoImg.src = LOGO_DIA;
    if (faviconImg) faviconImg.href = LOGO_DIA;
  } else {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    if (themeIcon) themeIcon.className = 'ri-sun-fill';
    if (logoImg) logoImg.src = LOGO_NOCHE;
    if (dashLogoImg) dashLogoImg.src = LOGO_NOCHE;
    if (faviconImg) faviconImg.href = LOGO_NOCHE;
  }
}

function setAuthMode(mode) {
  currentMode = mode;
  const groupUsername = document.getElementById('group-username');
  const btnSubmit = document.getElementById('btn-submit');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const msgBox = document.getElementById('message-box');

  if (msgBox) msgBox.style.display = 'none';

  if (mode === 'register') {
    if (groupUsername) groupUsername.style.display = 'flex';
    if (btnSubmit) btnSubmit.textContent = 'REGISTRARSE';
    if (tabRegister) tabRegister.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
  } else {
    if (groupUsername) groupUsername.style.display = 'none';
    if (btnSubmit) btnSubmit.textContent = 'INGRESAR';
    if (tabLogin) tabLogin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
  }
}

// UTILIDADES DE AUTENTICACIÓN
const TIMEOUT_FIRESTORE_MS = 8000;

function conTimeout(promesa, ms, etiqueta) {
  let timer;
  const limite = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout: ' + etiqueta)), ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(timer));
}

function setCargando(cargando) {
  const btn = document.getElementById('btn-submit');
  if (!btn) return;
  btn.disabled = cargando;
  if (cargando) {
    btn.textContent = 'UN MOMENTO...';
  } else {
    btn.textContent = currentMode === 'register' ? 'REGISTRARSE' : 'INGRESAR';
  }
}

function firebaseListo() {
  return !!(window.auth && window.db && window.doc && window.getDoc &&
            window.signInWithEmailAndPassword && window.createUserWithEmailAndPassword);
}

function mensajeErrorAuth(error) {
  switch (error && error.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return ["Datos incorrectos", "El correo o la contraseña no coinciden. Si te registraste con Google, usá el botón 'Continuar con Google'."];
    case 'auth/invalid-email':
      return ["Correo no válido", "Revisá que el correo esté bien escrito."];
    case 'auth/user-disabled':
      return ["Cuenta deshabilitada", "Esta cuenta fue deshabilitada. Contactá a un administrador."];
    case 'auth/too-many-requests':
      return ["Demasiados intentos", "Esperá unos minutos o restablecé tu contraseña."];
    case 'auth/network-request-failed':
      return ["Sin conexión", "No pudimos conectarnos con el servidor. Revisá tu internet e intentá de nuevo."];
    case 'auth/email-already-in-use':
      return ["Correo ya registrado", "Este correo ya tiene una cuenta. Cambiá a la pestaña 'Inicio de sesión' e ingresá."];
    case 'auth/weak-password':
      return ["Contraseña débil", "La contraseña debe tener al menos 6 caracteres."];
    default:
      return ["Error inesperado", `No se pudo completar la operación (${(error && (error.code || error.message)) || 'desconocido'}).`];
  }
}

async function continuarTrasLogin(user) {
  appState.user.username = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
  appState.user.email = user.email || '';

  let docSnap;
  try {
    const docRef = window.doc(window.db, "perfiles", user.uid);
    docSnap = await conTimeout(window.getDoc(docRef), TIMEOUT_FIRESTORE_MS, 'leer perfil');
  } catch (error) {
    console.error("Error al leer el perfil en Firestore:", error);
    mostrarModalNotificacion(
      "Sesión iniciada",
      "Ingresaste correctamente, pero no pudimos cargar tu perfil guardado. Podés completar tu perfil ahora."
    );
    showProfileSetup();
    return;
  }

  if (docSnap.exists()) {
    const datos = docSnap.data();
    appState.user.username = user.displayName || datos.displayName || appState.user.username;
    appState.user.year = datos.anio || appState.user.year;
    appState.user.orientation = datos.especialidad || 'General';
    appState.user.role = datos.rol || appState.user.role;
    appState.user.goodSubjects = datos.materiasBuenas || [];
    appState.user.badSubjects = datos.materiasMalas || [];
    appState.user.goodDesc = datos.descBuenas || '';
    appState.user.badDesc = datos.descMalas || '';

    await showDashboard(appState.user.username);
  } else {
    showProfileSetup();
  }
}

async function registrarUsuario(email, password, username) {
  try {
    const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
    const user = userCredential.user;
    const profileName = username !== '' ? username : email.split('@')[0];

    await window.updateProfile(user, { displayName: profileName });
    appState.user.username = profileName;

    await window.sendEmailVerification(user);
    mostrarModalVerificacion(user);
  } catch (error) {
    console.error("Error en registro:", error);
    const [titulo, mensaje] = mensajeErrorAuth(error);
    mostrarModalNotificacion(titulo, mensaje);
  }
}

async function iniciarSesion(email, password) {
  let user;
  try {
    const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
    user = userCredential.user;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    const [titulo, mensaje] = mensajeErrorAuth(error);
    mostrarModalNotificacion(titulo, mensaje);
    return;
  }

  if (!user.emailVerified) {
    mostrarModalVerificacion(user);
    return;
  }

  await continuarTrasLogin(user);
}

async function handleSubmit(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('user-email');
  const passwordInput = document.getElementById('user-password');
  const usernameInput = document.getElementById('user-name');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const username = usernameInput ? usernameInput.value.trim() : '';

  if (!email || !password) {
    mostrarModalNotificacion("Campos incompletos", "Por favor completa el correo y la contraseña.");
    return;
  }

  if (!firebaseListo()) {
    mostrarModalNotificacion(
      "Sin conexión con Firebase",
      "No se pudo cargar Firebase. Revisá tu conexión a internet y recargá la página."
    );
    return;
  }

  setCargando(true);
  try {
    if (currentMode === 'register') {
      await registrarUsuario(email, password, username);
    } else {
      await iniciarSesion(email, password);
    }
  } catch (error) {
    console.error("Error inesperado en handleSubmit:", error);
    mostrarModalNotificacion("Error inesperado", "Ocurrió un problema al continuar. Probá de nuevo.");
  } finally {
    setCargando(false);
  }
}

async function handleGoogleLogin() {
  if (!window.auth || !window.signInWithPopup || !window.GoogleAuthProvider) {
    mostrarModalNotificacion(
      "Sin conexión con Firebase",
      "No se pudo cargar Firebase. Revisá tu conexión a internet y recargá la página."
    );
    return;
  }

  try {
    const provider = new window.GoogleAuthProvider();
    const result = await window.signInWithPopup(window.auth, provider);
    await continuarTrasLogin(result.user);
  } catch (error) {
    console.error("Error con Google:", error);
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
    const [titulo, mensaje] = mensajeErrorAuth(error);
    mostrarModalNotificacion(titulo, mensaje);
  }
}

// MATERIAS Y ONBOARDING
const MATERIAS_COMPUTACION = [
  "Algoritmos", "Base de Datos", "Log. computacional", "Proyecto inf.",
  "Org. computacional", "Historia", "Matemática", "Lengua y Lit.", "Inglés", "Geografía"
];

const MATERIAS_AUTOMOTOR = [
  "Mec. y resistiv.", "Matemática", "Ciudadana", "Mecanismo",
  "Lengua y Lit.", "Neumática", "Electricidad", "Alineación", "Balanceo", "Inyección", "Estática", "Inglés"
];

const MATERIAS_GENERALES = [
  "Matemática", "Lengua y Literatura", "Historia", "Geografía",
  "Biología", "Física", "Química", "Inglés", "Educación Física", "Ciudadana", "Dibujo Artístico", "Dibujo Técnico"
];

function evaluarAnioEspecialidad(anio) {
  const groupEsp = document.getElementById('group-especialidad');
  const anioNum = parseInt(anio, 10);

  if (anioNum >= 4) {
    if (groupEsp) groupEsp.style.display = 'flex';
    document.getElementById('setup-especialidad').required = true;
    renderizarCheckboxesMaterias([]);
  } else {
    if (groupEsp) groupEsp.style.display = 'none';
    document.getElementById('setup-especialidad').required = false;
    renderizarCheckboxesMaterias(MATERIAS_GENERALES);
  }
}

function cargarMateriasPorEspecialidad(esp) {
  if (esp === 'computacion') {
    renderizarCheckboxesMaterias(MATERIAS_COMPUTACION);
  } else if (esp === 'automotor') {
    renderizarCheckboxesMaterias(MATERIAS_AUTOMOTOR);
  } else {
    renderizarCheckboxesMaterias([]);
  }
}

function renderizarCheckboxesMaterias(lista) {
  const contBuenas = document.getElementById('container-materias-buenas');
  const contMalas = document.getElementById('container-materias-malas');

  if (lista.length === 0) {
    contBuenas.innerHTML = '<p class="text-muted">Seleccioná una especialidad.</p>';
    contMalas.innerHTML = '<p class="text-muted">Seleccioná una especialidad.</p>';
    return;
  }

  let htmlBuenas = '';
  let htmlMalas = '';

  lista.forEach((mat) => {
    htmlBuenas += `<label><input type="checkbox" name="mat_buena" value="${mat}"> ${mat}</label>`;
    htmlMalas += `<label><input type="checkbox" name="mat_mala" value="${mat}"> ${mat}</label>`;
  });

  contBuenas.innerHTML = htmlBuenas;
  contMalas.innerHTML = htmlMalas;
}

function mostrarModalMaterias() {
  const modal = document.getElementById('modal-materias-error');
  if (modal) modal.style.display = 'flex';
}

function cerrarModalMaterias() {
  const modal = document.getElementById('modal-materias-error');
  if (modal) modal.style.display = 'none';
}

async function guardarPerfilInicial(event) {
  if (event) event.preventDefault();

  const buenasChecked = document.querySelectorAll('input[name="mat_buena"]:checked');
  const malasChecked = document.querySelectorAll('input[name="mat_mala"]:checked');

  if (buenasChecked.length < 2 || malasChecked.length < 2) {
    mostrarModalMaterias();
    return;
  }

  cerrarModalMaterias();

  const anio = document.getElementById('setup-anio')?.value || '1';
  const especialidad = document.getElementById('setup-especialidad')?.value || 'General';
  const rol = document.querySelector('input[name="rol"]:checked')?.value || 'ayudar';

  appState.user.year = `${anio}.º Año`;
  appState.user.orientation = especialidad;
  appState.user.role = rol === 'ayudar' ? 'Tutor / Ayudante' : 'Estudiante';
  appState.user.goodSubjects = Array.from(buenasChecked).map(cb => cb.value);
  appState.user.badSubjects = Array.from(malasChecked).map(cb => cb.value);
  appState.user.goodDesc = document.getElementById('desc-buenas')?.value || 'Buenas habilidades académicas.';
  appState.user.badDesc = document.getElementById('desc-malas')?.value || 'Buscando ayuda escolar.';

  const usuarioActual = window.auth && window.auth.currentUser;
  if (usuarioActual && window.setDoc && window.db) {
    try {
      await conTimeout(
        window.setDoc(window.doc(window.db, "perfiles", usuarioActual.uid), {
          displayName: appState.user.username,
          email: usuarioActual.email || '',
          anio: appState.user.year,
          especialidad: appState.user.orientation,
          rol: appState.user.role,
          materiasBuenas: appState.user.goodSubjects,
          materiasMalas: appState.user.badSubjects,
          descBuenas: appState.user.goodDesc,
          descMalas: appState.user.badDesc
        }, { merge: true }),
        TIMEOUT_FIRESTORE_MS,
        'guardar perfil'
      );
    } catch (error) {
      console.error("Error al guardar el perfil en Firestore:", error);
      mostrarModalNotificacion(
        "Perfil sin guardar",
        "Tu perfil se creó pero no pudo sincronizarse en la nube."
      );
    }
  }

  await showDashboard(appState.user.username);
}

// CATÁLOGO DE RECOMPENSAS
function renderRewardsCatalog() {
  const grid = document.querySelector('.rewards-grid');
  if (!grid) return;

  grid.innerHTML = rewardCatalog.map(item => `
    <div class="reward-item">
      <div class="reward-img-box">
        <img src="${item.img}" alt="${item.title}">
      </div>
      <div>
        <strong>${item.title}</strong>
        <div class="reward-sub">${item.desc}</div>
      </div>
      <button class="task-btn full-width" onclick="openRewardModal('${item.title}', ${item.costPts}, ${item.costLibritos})">
        ${item.costPts} Pts (${item.costLibritos} Libritos)
      </button>
    </div>
  `).join('');
}

function openRewardModal(title, costPts, costLibritos) {
  appState.selectedRewardCost = costPts;
  document.getElementById('rewardModalTitle').innerText = title;
  document.getElementById('rewardPointsTxt').innerText = `${costPts} Pts (${costLibritos} Libritos)`;

  document.getElementById('rewardStep1').style.display = 'block';
  document.getElementById('rewardStep2').style.display = 'none';
  document.getElementById('rewardStepError').style.display = 'none';

  document.getElementById('rewardModal').style.display = 'flex';
}

function closeRewardModal() {
  document.getElementById('rewardModal').style.display = 'none';
}

function generateRewardCode() {
  if (appState.points >= appState.selectedRewardCost) {
    appState.points -= appState.selectedRewardCost;
    appState.libritos = Math.floor(appState.points / 1000);

    const code = 'LIB-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('rewardGeneratedCode').innerText = code;

    document.getElementById('rewardStep1').style.display = 'none';
    document.getElementById('rewardStep2').style.display = 'block';

    updateProfileUI();
  } else {
    document.getElementById('rewardErrorMsg').innerText = `Necesitás ${appState.selectedRewardCost} pts y tenés ${appState.points} pts.`;
    document.getElementById('rewardStep1').style.display = 'none';
    document.getElementById('rewardStepError').style.display = 'block';
  }
}

// NOTIFICACIONES
function mostrarModalNotificacion(titulo, mensaje) {
  const modal = document.getElementById('modal-notificacion');
  const txtTitulo = document.getElementById('modal-titulo');
  const txtMensaje = document.getElementById('modal-mensaje');

  if (modal && txtTitulo && txtMensaje) {
    txtTitulo.textContent = titulo;
    txtMensaje.textContent = mensaje;
    modal.style.display = 'flex';
  }
}

function cerrarModalNotificacion() {
  const modal = document.getElementById('modal-notificacion');
  if (modal) modal.style.display = 'none';
}

async function recuperarContrasena(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('user-email');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    mostrarModalNotificacion("Campo incompleto", "Por favor, escribí tu correo para enviarte el enlace.");
    return;
  }

  try {
    if (window.auth && window.sendPasswordResetEmail) {
      await window.sendPasswordResetEmail(window.auth, email);
      mostrarModalNotificacion("¡Correo enviado!", `Te enviamos un enlace a ${email} para restablecer tu contraseña.`);
    }
  } catch (error) {
    mostrarModalNotificacion("¡Correo enviado!", `Te enviamos un enlace a ${email} para restablecer tu contraseña.`);
  }
}

// PESTAÑAS E INTERFAZ
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  if (btnElement) btnElement.classList.add('active');

  try { sessionStorage.setItem('libritos_tab', tabId); } catch (e) {}
}

function completeTask(btn, points) {
  appState.points += points;
  appState.libritos = Math.floor(appState.points / 1000);

  const totalPointsEl = document.getElementById('totalPoints');
  const libritosCountEl = document.getElementById('libritosCount');
  const todayValEl = document.getElementById('todayVal');
  const todayBarEl = document.getElementById('todayBar');

  if (totalPointsEl) totalPointsEl.innerText = appState.points;
  if (libritosCountEl) libritosCountEl.innerText = appState.libritos;
  if (todayValEl) todayValEl.innerText = appState.points;

  if (todayBarEl) {
    const height = Math.min((appState.points / 10000) * 100, 100);
    todayBarEl.style.height = height + 'px';
  }

  btn.disabled = true;
  btn.innerText = '¡Completado!';

  updateProfileUI();
}

function toggleStatus() {
  const status = document.getElementById('statusSelect').value;
  appState.user.status = status;
  const statusText = document.getElementById('profileStatusText');

  if (status === 'online') {
    statusText.innerHTML = '<span class="status-dot status-online"></span>Disponible';
  } else {
    statusText.innerHTML = '<span class="status-dot status-offline"></span>Ocupado';
  }
}

function updateProfileUI() {
  const u = appState.user;
  const profileUsername = document.getElementById('profileUsername');
  const profileYear = document.getElementById('profileYear');
  const profileRole = document.getElementById('profileRole');
  const roleDisplay = document.getElementById('roleDisplay');
  const profileLibritos = document.getElementById('profileLibritos');
  const profilePts = document.getElementById('profilePts');
  const totalPoints = document.getElementById('totalPoints');
  const libritosCount = document.getElementById('libritosCount');

  if (profileUsername) profileUsername.innerText = u.username || '-';
  if (profileYear) profileYear.innerText = `${u.year} ${u.orientation ? '(' + u.orientation + ')' : ''}`;
  if (profileRole) profileRole.innerText = u.role || '-';
  if (roleDisplay) roleDisplay.innerText = `${u.year} | ${u.orientation}`;
  if (profileLibritos) profileLibritos.innerText = `📚 ${appState.libritos} Libritos`;
  if (profilePts) profilePts.innerText = `${appState.points} Pts`;
  if (totalPoints) totalPoints.innerText = appState.points;
  if (libritosCount) libritosCount.innerText = appState.libritos;
}

// BÚSQUEDA Y FIRESTORE SOCIAL
async function cargarComunidadDesdeFirestore() {
  if (!window.db || !window.collection || !window.getDocs) return;

  try {
    const querySnapshot = await window.getDocs(window.collection(window.db, "perfiles"));
    const usuariosReales = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      usuariosReales.push({
        name: data.displayName || "Usuario de Libritos",
        year: data.anio || "1.º Año",
        orientation: data.especialidad || "General",
        status: "online",
        stars: 5,
        goodSubjects: data.materiasBuenas || [],
        goodDesc: data.descBuenas || "",
        badSubjects: data.materiasMalas || [],
        badDesc: data.descMalas || ""
      });
    });

    communityUsers = usuariosReales;
    renderUsersList(communityUsers);
  } catch (error) {
    console.error("Error al cargar la comunidad desde Firestore:", error);
  }
}

function renderUsersList(filteredUsers = communityUsers) {
  const container = document.getElementById('usersListContainer');
  if (!container) return;
  container.innerHTML = '';

  if (filteredUsers.length === 0) {
    container.innerHTML = '<p class="subtitle-text center-text margin-top-sm">No se encontraron compañeros con los criterios ingresados.</p>';
    return;
  }

  filteredUsers.forEach((u) => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.onclick = () => openUserProfile(u);

    const statusDot = u.status === 'online'
      ? '<span class="status-dot status-online"></span>'
      : '<span class="status-dot status-offline"></span>';

    const starsStr = '★'.repeat(u.stars) + '☆'.repeat(5 - u.stars);

    item.innerHTML = `
      <div class="user-header">
        <div class="user-name">${statusDot}${u.name}</div>
        <div class="user-rep">${starsStr}</div>
      </div>
      <div class="reward-sub">${u.year} ${u.orientation ? '| ' + u.orientation : ''}</div>
      <div class="tags-container">
        ${(u.goodSubjects || []).map(s => `<span class="tag">${s}</span>`).join('')}
      </div>
    `;
    container.appendChild(item);
  });
}

function filterUsers() {
  const queryInput = document.getElementById('searchInput');
  const query = queryInput ? queryInput.value.toLowerCase() : '';
  const minStars = parseInt(document.getElementById('filterStars')?.value || 0, 10);
  const yearVal = document.getElementById('filterYear')?.value || 'all';
  const orientationVal = document.getElementById('filterOrientation')?.value || 'all';

  const filtered = communityUsers.filter(u => {
    const matchesQuery = u.name.toLowerCase().includes(query) ||
      (u.goodSubjects && u.goodSubjects.some(s => s.toLowerCase().includes(query)));
    const matchesStars = u.stars >= minStars;
    const matchesYear = (yearVal === 'all') || (u.year.includes(yearVal));
    const matchesOrientation = (orientationVal === 'all') || (u.orientation.toLowerCase().includes(orientationVal.toLowerCase()));

    return matchesQuery && matchesStars && matchesYear && matchesOrientation;
  });

  renderUsersList(filtered);
}

function openUserProfile(user) {
  document.getElementById('modalUserName').innerText = user.name;
  document.getElementById('modalUserYear').innerText = user.year + (user.orientation ? ` (${user.orientation})` : '');

  const statusEl = document.getElementById('modalUserStatus');
  statusEl.innerHTML = user.status === 'online'
    ? '<span style="color: var(--success);">● En línea / Disponible</span>'
    : '<span style="color: var(--danger);">● Ocupado / Desconectado</span>';

  document.getElementById('modalUserRep').innerText = '★'.repeat(user.stars) + '☆'.repeat(5 - user.stars);

  const ratingsContainer = document.getElementById('modalSubjectRatings');
  ratingsContainer.innerHTML = '<div>General: <span class="stars-gold">★★★★★</span></div>';

  document.getElementById('modalGoodDesc').innerText = user.goodDesc || 'Sin descripción';

  const badTags = document.getElementById('modalBadTags');
  badTags.innerHTML = (user.badSubjects || []).map(s => `<span class="tag tag-bad">${s}</span>`).join('');
  document.getElementById('modalBadDesc').innerText = user.badDesc || 'Sin observaciones';

  document.getElementById('userModal').style.display = 'flex';
}

function closeUserProfile() {
  document.getElementById('userModal').style.display = 'none';
}

// ==========================================================================
// SOCIAL: SECCIONES (BUSCAR AYUDA / BANCO DE APUNTES)
// ==========================================================================
function cambiarSeccionSocial(seccion) {
  const esApuntes = seccion === 'apuntes';
  const ayuda = document.getElementById('social-ayuda');
  const apuntes = document.getElementById('social-apuntes');
  if (ayuda) ayuda.style.display = esApuntes ? 'none' : '';
  if (apuntes) apuntes.style.display = esApuntes ? '' : 'none';

  document.getElementById('btn-social-ayuda')?.classList.toggle('active', !esApuntes);
  document.getElementById('btn-social-apuntes')?.classList.toggle('active', esApuntes);

  try { sessionStorage.setItem('libritos_social', esApuntes ? 'apuntes' : 'ayuda'); } catch (e) {}

  if (esApuntes) cargarApuntes();
}

// ==========================================================================
// BANCO DE APUNTES
// Las imágenes se comprimen en el navegador y se guardan en Firestore
// (colección "apuntes"), así no hace falta activar Firebase Storage.
// ==========================================================================
const MAX_IMAGENES_APUNTE = 3;
const MAX_CHARS_APUNTE = 900 * 1024; // Firestore permite ~1 MiB por documento
const TODAS_LAS_MATERIAS = Array.from(
  new Set([...MATERIAS_GENERALES, ...MATERIAS_COMPUTACION, ...MATERIAS_AUTOMOTOR])
).sort((a, b) => a.localeCompare(b, 'es'));

let apuntesCache = [];
let imagenesNuevas = [];      // [{ file, dataUrl }]
let apunteAbiertoId = null;
let publicandoApunte = false;

function escaparHTML(texto) {
  return String(texto == null ? '' : texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function poblarSelectsApuntes() {
  const opciones = TODAS_LAS_MATERIAS.map(m => `<option value="${escaparHTML(m)}">${escaparHTML(m)}</option>`).join('');
  const selSubir = document.getElementById('apunte-materia');
  const selFiltro = document.getElementById('notesFilterMateria');
  if (selSubir) selSubir.innerHTML = opciones;
  if (selFiltro) selFiltro.innerHTML = '<option value="all">Todas las materias</option>' + opciones;
}

function comprimirImagen(file, maxLado, calidad) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * escala));
      canvas.height = Math.max(1, Math.round(img.height * escala));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

function mostrarErrorApunte(texto) {
  const el = document.getElementById('apunte-error');
  if (!el) return;
  el.textContent = texto || '';
  el.style.display = texto ? 'block' : 'none';
}

function abrirModalSubirApunte() {
  if (!(window.auth && window.auth.currentUser)) {
    mostrarModalNotificacion('Sesión requerida', 'Iniciá sesión para subir apuntes.');
    return;
  }
  const modal = document.getElementById('modal-apunte-subir');
  if (modal) modal.style.display = 'flex';
}

function cerrarModalSubirApunte() {
  const modal = document.getElementById('modal-apunte-subir');
  if (modal) modal.style.display = 'none';
  imagenesNuevas = [];
  ['apunte-titulo', 'apunte-desc', 'apunte-imagenes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderPreviewsApunte();
  mostrarErrorApunte('');
}

function renderPreviewsApunte() {
  const cont = document.getElementById('apunte-previews');
  if (!cont) return;
  cont.innerHTML = '';
  imagenesNuevas.forEach((img, i) => {
    const box = document.createElement('div');
    box.className = 'notes-preview';
    box.innerHTML = `<img src="${img.dataUrl}" alt="Vista previa ${i + 1}">
      <button type="button" aria-label="Quitar imagen">✕</button>`;
    box.querySelector('button').onclick = () => {
      imagenesNuevas.splice(i, 1);
      renderPreviewsApunte();
    };
    cont.appendChild(box);
  });
}

async function agregarImagenesApunte(input) {
  mostrarErrorApunte('');
  const archivos = Array.from(input.files || []).filter(f => f.type.startsWith('image/'));
  input.value = '';

  for (const file of archivos) {
    if (imagenesNuevas.length >= MAX_IMAGENES_APUNTE) {
      mostrarErrorApunte(`Podés subir hasta ${MAX_IMAGENES_APUNTE} imágenes por apunte.`);
      break;
    }
    try {
      const dataUrl = await comprimirImagen(file, 1280, 0.7);
      imagenesNuevas.push({ file, dataUrl });
    } catch (error) {
      console.error(error);
      mostrarErrorApunte('Una de las imágenes no se pudo leer. Probá con otra.');
    }
  }
  renderPreviewsApunte();
}

async function publicarApunte() {
  if (publicandoApunte) return;
  mostrarErrorApunte('');

  const user = window.auth && window.auth.currentUser;
  if (!user) {
    mostrarErrorApunte('Tenés que iniciar sesión para publicar.');
    return;
  }
  if (!(window.addDoc && window.collection && window.db)) {
    mostrarErrorApunte('No se pudo conectar con Firebase. Recargá la página.');
    return;
  }

  const titulo = document.getElementById('apunte-titulo').value.trim();
  const materia = document.getElementById('apunte-materia').value;
  const anio = document.getElementById('apunte-anio').value;
  const descripcion = document.getElementById('apunte-desc').value.trim();

  if (!titulo) { mostrarErrorApunte('Escribí un título para tus apuntes.'); return; }
  if (imagenesNuevas.length === 0) { mostrarErrorApunte('Agregá al menos una imagen.'); return; }

  const imagenes = imagenesNuevas.map(i => i.dataUrl);
  let miniatura;
  try {
    miniatura = await comprimirImagen(imagenesNuevas[0].file, 400, 0.6);
  } catch (e) {
    miniatura = imagenes[0];
  }

  const total = imagenes.reduce((a, b) => a + b.length, 0) + miniatura.length;
  if (total > MAX_CHARS_APUNTE) {
    mostrarErrorApunte('Las imágenes pesan demasiado. Quitá alguna o usá fotos más simples.');
    return;
  }

  const btn = document.getElementById('btn-publicar-apunte');
  publicandoApunte = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Publicando...'; }

  try {
    await conTimeout(
      window.addDoc(window.collection(window.db, 'apuntes'), {
        titulo,
        materia,
        anio,
        descripcion,
        imagenes,
        miniatura,
        autorUid: user.uid,
        autorNombre: appState.user.username || user.displayName || 'Usuario',
        createdAt: Date.now()
      }),
      20000,
      'publicar apunte'
    );
    cerrarModalSubirApunte();
    mostrarModalNotificacion('¡Apunte publicado!', 'Gracias por compartir. Tus compañeros ya pueden verlo.');
    await cargarApuntes();
  } catch (error) {
    console.error('Error al publicar el apunte:', error);
    if (error && error.code === 'permission-denied') {
      mostrarErrorApunte('Firebase no permite escribir en "apuntes". Hay que actualizar las reglas de Firestore.');
    } else {
      mostrarErrorApunte('No se pudo publicar. Revisá tu conexión e intentá de nuevo.');
    }
  } finally {
    publicandoApunte = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
  }
}

async function cargarApuntes() {
  const cont = document.getElementById('notesListContainer');
  if (!cont) return;
  if (!(window.db && window.collection && window.getDocs && window.query && window.orderBy && window.limit)) return;

  if (apuntesCache.length === 0) {
    cont.innerHTML = '<p class="subtitle-text center-text margin-top-sm">Cargando apuntes...</p>';
  }

  try {
    const q = window.query(
      window.collection(window.db, 'apuntes'),
      window.orderBy('createdAt', 'desc'),
      window.limit(40)
    );
    const snap = await window.getDocs(q);
    apuntesCache = [];
    snap.forEach(d => apuntesCache.push({ id: d.id, ...d.data() }));
    filtrarApuntes();
  } catch (error) {
    console.error('Error al cargar los apuntes:', error);
    cont.innerHTML = error && error.code === 'permission-denied'
      ? '<p class="subtitle-text center-text margin-top-sm">No hay permiso para leer los apuntes. Hay que actualizar las reglas de Firestore.</p>'
      : '<p class="subtitle-text center-text margin-top-sm">No se pudieron cargar los apuntes. Intentá de nuevo más tarde.</p>';
  }
}

function filtrarApuntes() {
  const texto = (document.getElementById('notesSearch')?.value || '').toLowerCase();
  const materia = document.getElementById('notesFilterMateria')?.value || 'all';
  const anio = document.getElementById('notesFilterYear')?.value || 'all';

  const filtrados = apuntesCache.filter(n => {
    const coincideTexto = !texto ||
      (n.titulo || '').toLowerCase().includes(texto) ||
      (n.materia || '').toLowerCase().includes(texto) ||
      (n.autorNombre || '').toLowerCase().includes(texto);
    return coincideTexto &&
      (materia === 'all' || n.materia === materia) &&
      (anio === 'all' || n.anio === anio);
  });

  renderApuntes(filtrados);
}

function renderApuntes(lista) {
  const cont = document.getElementById('notesListContainer');
  if (!cont) return;
  cont.innerHTML = '';

  if (lista.length === 0) {
    cont.innerHTML = '<p class="subtitle-text center-text margin-top-sm">Todavía no hay apuntes con esos criterios. ¡Sé el primero en subir uno!</p>';
    return;
  }

  lista.forEach(n => {
    const item = document.createElement('div');
    item.className = 'user-item note-card';
    item.onclick = () => abrirApunte(n.id);

    const fecha = n.createdAt ? new Date(n.createdAt).toLocaleDateString('es-AR') : '';
    const cantidad = (n.imagenes || []).length;

    item.innerHTML = `
      <div class="note-thumb"><img src="${n.miniatura || (n.imagenes || [])[0] || ''}" alt="Apunte de ${escaparHTML(n.materia)}"></div>
      <div class="user-name">${escaparHTML(n.titulo)}</div>
      <div class="tags-container">
        <span class="tag">${escaparHTML(n.materia)}</span>
        <span class="tag">${escaparHTML(n.anio)}</span>
      </div>
      <div class="reward-sub">Por ${escaparHTML(n.autorNombre)} · ${fecha} · ${cantidad} ${cantidad === 1 ? 'imagen' : 'imágenes'}</div>
    `;
    cont.appendChild(item);
  });
}

function abrirApunte(id) {
  const n = apuntesCache.find(x => x.id === id);
  if (!n) return;
  apunteAbiertoId = id;

  document.getElementById('verApunteTitulo').textContent = n.titulo;
  const fecha = n.createdAt ? new Date(n.createdAt).toLocaleDateString('es-AR') : '';
  document.getElementById('verApunteMeta').textContent = `${n.materia} · ${n.anio} · Por ${n.autorNombre} · ${fecha}`;

  const desc = document.getElementById('verApunteDesc');
  desc.textContent = n.descripcion || '';
  desc.style.display = n.descripcion ? 'block' : 'none';

  const cont = document.getElementById('verApunteImagenes');
  cont.innerHTML = '';
  (n.imagenes || []).forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Apunte ${i + 1}`;
    cont.appendChild(img);
  });

  const user = window.auth && window.auth.currentUser;
  const btnEliminar = document.getElementById('btn-eliminar-apunte');
  if (btnEliminar) btnEliminar.style.display = (user && user.uid === n.autorUid) ? '' : 'none';

  document.getElementById('modal-apunte-ver').style.display = 'flex';
}

function cerrarModalVerApunte() {
  const modal = document.getElementById('modal-apunte-ver');
  if (modal) modal.style.display = 'none';
  apunteAbiertoId = null;
}

async function eliminarApunte() {
  const n = apuntesCache.find(x => x.id === apunteAbiertoId);
  const user = window.auth && window.auth.currentUser;
  if (!n || !user || user.uid !== n.autorUid) return;
  if (!window.confirm('¿Seguro que querés eliminar este apunte?')) return;

  try {
    await window.deleteDoc(window.doc(window.db, 'apuntes', n.id));
    cerrarModalVerApunte();
    await cargarApuntes();
  } catch (error) {
    console.error('Error al eliminar el apunte:', error);
    mostrarModalNotificacion('No se pudo eliminar', 'Intentá de nuevo en unos segundos.');
  }
}

// CERRAR SESIÓN
function logout() {
  const modal = document.getElementById('modal-logout');
  if (modal) modal.style.display = 'flex';
}

function cerrarModalLogout() {
  const modal = document.getElementById('modal-logout');
  if (modal) modal.style.display = 'none';
}

async function confirmarLogout() {
  try { sessionStorage.removeItem('libritos_tab'); sessionStorage.removeItem('libritos_social'); } catch (e) {}
  try {
    if (window.signOut && window.auth) {
      await window.signOut(window.auth);
    }
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
  location.reload();
}

// VERIFICACIÓN DE MAIL EN MODAL
function mostrarModalVerificacion(user) {
  const modalExistente = document.getElementById('modal-verificacion');
  if (modalExistente) modalExistente.remove();
  if (intervaloVerificacion) clearInterval(intervaloVerificacion);

  const mensaje = `
    Enviamos un correo de confirmación a <strong>${user.email}</strong>.<br><br>
    Por favor, abrí tu Gmail y hacé clic en el enlace de verificación.<br>
    <em>Esta ventana se cerrará automáticamente apenas verifiques tu correo.</em>
  `;

  const modalHTML = `
    <div id="modal-verificacion" class="modal-overlay">
      <div class="modal-content">
        <button id="btn-cerrar-verificacion" class="btn-cerrar-modal" aria-label="Cerrar">&times;</button>
        <h3>Verificá tu correo electrónico</h3>
        <p>${mensaje}</p>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button id="btn-reenviar-mail" class="btn-secondary">Reenviar correo</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const cerrarModal = () => {
    if (intervaloVerificacion) clearInterval(intervaloVerificacion);
    const modalElement = document.getElementById('modal-verificacion');
    if (modalElement) modalElement.remove();
  };

  document.getElementById('btn-cerrar-verificacion').addEventListener('click', cerrarModal);

  document.getElementById('btn-reenviar-mail').addEventListener('click', async () => {
    try {
      await window.sendEmailVerification(user);
      mostrarModalNotificacion("Correo reenviado", "Te enviamos un nuevo enlace a tu casilla de Gmail.");
    } catch (err) {
      mostrarModalNotificacion("Espera un momento", "Por favor espera unos segundos antes de solicitar otro correo.");
    }
  });

  intervaloVerificacion = setInterval(async () => {
    try {
      await user.reload();
      if (!document.getElementById('modal-verificacion')) return;
      if (user.emailVerified) {
        cerrarModal();
        mostrarModalNotificacion("¡Correo verificado!", "Tu cuenta ha sido confirmada con éxito.");
        await continuarTrasLogin(user);
      }
    } catch (error) {
      console.error("Error al comprobar verificación automática:", error);
    }
  }, 3000);
}

// EXPOSICIÓN GLOBAL DE FUNCIONES
window.toggleTheme = toggleTheme;
window.setAuthMode = setAuthMode;
window.handleSubmit = handleSubmit;
window.handleGoogleLogin = handleGoogleLogin;
window.recuperarContrasena = recuperarContrasena;
window.evaluarAnioEspecialidad = evaluarAnioEspecialidad;
window.cargarMateriasPorEspecialidad = cargarMateriasPorEspecialidad;
window.mostrarModalMaterias = mostrarModalMaterias;
window.cerrarModalMaterias = cerrarModalMaterias;
window.guardarPerfilInicial = guardarPerfilInicial;
window.mostrarModalNotificacion = mostrarModalNotificacion;
window.cerrarModalNotificacion = cerrarModalNotificacion;
window.switchTab = switchTab;
window.completeTask = completeTask;
window.openRewardModal = openRewardModal;
window.closeRewardModal = closeRewardModal;
window.generateRewardCode = generateRewardCode;
window.toggleStatus = toggleStatus;
window.filterUsers = filterUsers;
window.openUserProfile = openUserProfile;
window.closeUserProfile = closeUserProfile;
window.logout = logout;
window.cerrarModalLogout = cerrarModalLogout;
window.confirmarLogout = confirmarLogout;
window.mostrarVista = mostrarVista;
window.showDashboard = showDashboard;
window.showProfileSetup = showProfileSetup;
window.restaurarSesion = restaurarSesion;
window.cambiarSeccionSocial = cambiarSeccionSocial;
window.abrirModalSubirApunte = abrirModalSubirApunte;
window.cerrarModalSubirApunte = cerrarModalSubirApunte;
window.agregarImagenesApunte = agregarImagenesApunte;
window.publicarApunte = publicarApunte;
window.filtrarApuntes = filtrarApuntes;
window.abrirApunte = abrirApunte;
window.cerrarModalVerApunte = cerrarModalVerApunte;
window.eliminarApunte = eliminarApunte;

poblarSelectsApuntes();
