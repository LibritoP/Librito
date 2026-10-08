const LOGO_DIA = 'libritol.png';
const LOGO_NOCHE = 'libritos1.png';
let intervaloVerificacion = null;
let currentMode = 'login';

// ESTADO GENERAL DE LA APLICACIÓN
let appState = {
  points: 0,          // Arranca con 5000 pts (equivalente a 5 Libritos)
  libritos: 0,           // 1 Librito = 1000 Puntos
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

// CONTROL STRICTO DE PROCESOS (SEPARACIÓN PANTALLAS)
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

function showDashboard(nombreUsuario) {
  mostrarVista('dashboard-view');
  if (nombreUsuario) {
    appState.user.username = nombreUsuario;
  }
  updateProfileUI();
  renderRewardsCatalog();
  renderUsersList();
  cargarComunidadDesdeFirestore();
}

function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const logoImg = document.getElementById('app-logo');
  const dashLogoImg = document.getElementById('dash-logo'); // ← Se añade la referencia al logo del Dashboard
  const isDark = body.classList.contains('theme-dark');

  if (isDark) {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    if (themeIcon) themeIcon.className = 'ri-moon-fill';
    if (logoImg) logoImg.src = LOGO_DIA;
    if (dashLogoImg) dashLogoImg.src = LOGO_DIA; // ← Cambia a la imagen de día
  } else {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    if (themeIcon) themeIcon.className = 'ri-sun-fill';
    if (logoImg) logoImg.src = LOGO_NOCHE;
    if (dashLogoImg) dashLogoImg.src = LOGO_NOCHE; // ← Cambia a la imagen de noche
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

// ==========================================
// UTILIDADES DE AUTENTICACIÓN
// ==========================================
const TIMEOUT_FIRESTORE_MS = 8000;

// Evita que una llamada a Firebase quede colgada para siempre ("no pasa nada")
function conTimeout(promesa, ms, etiqueta) {
  let timer;
  const limite = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout: ' + etiqueta)), ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(timer));
}

// Bloquea el botón mientras se procesa (evita doble clic y muestra actividad)
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

// Traduce el código de error de Firebase a un mensaje que diga lo que realmente pasó
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
      return ["Demasiados intentos", "Esperá unos minutos o restablecé tu contraseña con '¿Olvidaste tu contraseña?'."];
    case 'auth/network-request-failed':
      return ["Sin conexión", "No pudimos conectarnos con el servidor. Revisá tu internet e intentá de nuevo."];
    case 'auth/email-already-in-use':
      return ["Correo ya registrado", "Este correo ya tiene una cuenta. Cambiá a la pestaña 'Inicio de sesión' e ingresá."];
    case 'auth/weak-password':
      return ["Contraseña débil", "La contraseña debe tener al menos 6 caracteres."];
    case 'auth/operation-not-allowed':
      return ["Método no habilitado", "Este método de acceso no está habilitado en Firebase (Authentication → Sign-in method)."];
    case 'auth/popup-blocked':
      return ["Ventana bloqueada", "El navegador bloqueó la ventana de Google. Permití las ventanas emergentes e intentá de nuevo."];
    case 'auth/unauthorized-domain':
      return ["Dominio no autorizado", "Este dominio no está autorizado en Firebase (Authentication → Settings → Dominios autorizados)."];
    default:
      return ["Error inesperado", `No se pudo completar la operación (${(error && (error.code || error.message)) || 'desconocido'}).`];
  }
}

// Agrega (o reemplaza) al usuario actual en la lista de la comunidad
function agregarUsuarioAComunidad() {
  const u = appState.user;
  communityUsers = communityUsers.filter(c => !c.esPropio);
  communityUsers.unshift({
    esPropio: true,
    name: u.username,
    year: u.year,
    orientation: u.orientation,
    status: u.status || "online",
    stars: 5,
    subjectRatings: { [u.goodSubjects[0] || 'General']: 5 },
    goodSubjects: u.goodSubjects,
    goodDesc: u.goodDesc,
    badSubjects: u.badSubjects,
    badDesc: u.badDesc
  });
}

// Paso común después de autenticarse: carga el perfil guardado y decide a qué pantalla ir
async function continuarTrasLogin(user) {
  appState.user.username = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
  appState.user.email = user.email || '';

  let docSnap;
  try {
    const docRef = window.doc(window.db, "perfiles", user.uid);
    docSnap = await conTimeout(window.getDoc(docRef), TIMEOUT_FIRESTORE_MS, 'leer perfil');
  } catch (error) {
    // La sesión SÍ es válida; lo que falló es la base de datos (reglas, base sin crear o sin conexión)
    console.error("Error al leer el perfil en Firestore:", error);
    mostrarModalNotificacion(
      "Sesión iniciada",
      "Ingresaste correctamente, pero no pudimos cargar tu perfil guardado. Revisá que Firestore esté creado y que sus reglas permitan leer 'perfiles'. Por ahora podés completar tu perfil de nuevo."
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

    agregarUsuarioAComunidad();
    showDashboard(appState.user.username);
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

    // Enviar correo de verificación y abrir el modal de espera
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
    // Solo los errores de AUTENTICACIÓN llegan acá
    console.error("Error al iniciar sesión:", error);
    const [titulo, mensaje] = mensajeErrorAuth(error);
    mostrarModalNotificacion(titulo, mensaje);
    return;
  }

  // Bloqueamos el paso si todavía no verificó su correo
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
    // Si cerró la ventana a propósito, no mostramos nada
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
    const [titulo, mensaje] = mensajeErrorAuth(error);
    mostrarModalNotificacion(titulo, mensaje);
  }
}

function showMessage(text, type) {
  const msgBox = document.getElementById('message-box');
  if (!msgBox) return;
  msgBox.textContent = text;
  msgBox.className = `message-box ${type}`;
  msgBox.style.display = 'block';
}

// MATERIAS Y CARGA DE DICCIONARIOS
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
  
  // Agregar perfil creado a la Comunidad Social
  agregarUsuarioAComunidad();

  // GUARDAR EL PERFIL EN FIRESTORE (antes no se guardaba, por eso al volver a
  // iniciar sesión siempre te mandaba a configurar el perfil de nuevo)
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
    await cargarComunidadDesdeFirestore();
    } catch (error) {
      console.error("Error al guardar el perfil en Firestore:", error);
      mostrarModalNotificacion(
        "Perfil sin guardar",
        "Tu perfil se creó, pero no pudimos guardarlo en la nube. Revisá las reglas de Firestore para la colección 'perfiles'."
      );
    }
  }

  // PASO 2 -> PASO 3: Muestra la Interfaz Principal
  showDashboard(appState.user.username);
}

// RENDERIZADO DE CATÁLOGO DE RECOMPENSAS
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

// MODAL DE CANJE CON CÓDIGO ALEATORIO
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

    // Generación del código aleatorio único (Ejemplo: LIB-849201)
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

// MODALES DE NOTIFICACIÓN
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

// PESTAÑAS Y FUNCIONALIDAD DE INTERFAZ
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  if (btnElement) btnElement.classList.add('active');
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

// BÚSQUEDA Y COMUNIDAD EN SOCIAL
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
        ${u.goodSubjects.map(s => `<span class="tag">${s}</span>`).join('')}
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
      u.goodSubjects.some(s => s.toLowerCase().includes(query));
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
  if (user.subjectRatings) {
    ratingsContainer.innerHTML = Object.entries(user.subjectRatings)
      .map(([subject, rating]) => `<div>${subject}: <span class="stars-gold">${'★'.repeat(rating)}</span></div>`)
      .join('');
  } else {
    ratingsContainer.innerHTML = '<div>General: <span class="stars-gold">★★★★★</span></div>';
  }

  document.getElementById('modalGoodDesc').innerText = user.goodDesc || 'Sin descripción';

  const badTags = document.getElementById('modalBadTags');
  badTags.innerHTML = (user.badSubjects || []).map(s => `<span class="tag tag-bad">${s}</span>`).join('');
  document.getElementById('modalBadDesc').innerText = user.badDesc || 'Sin observaciones';

  document.getElementById('userModal').style.display = 'flex';
}

function closeUserProfile() {
  document.getElementById('userModal').style.display = 'none';
}

// Abre el modal de confirmación (reemplaza al confirm() del navegador)
function logout() {
  const modal = document.getElementById('modal-logout');
  if (modal) modal.style.display = 'flex';
}

function cerrarModalLogout() {
  const modal = document.getElementById('modal-logout');
  if (modal) modal.style.display = 'none';
}

async function confirmarLogout() {
  try {
    if (window.signOut && window.auth) await window.signOut(window.auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
  location.reload();
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

function mostrarModalVerificacion(user) {
  // Remover modal e intervalo previo si existían
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

  // Botón 'X' para cerrar manualmente (si cierra sin verificar, no podrá loguearse)
  document.getElementById('btn-cerrar-verificacion').addEventListener('click', cerrarModal);

  // Reenviar correo
  document.getElementById('btn-reenviar-mail').addEventListener('click', async () => {
    try {
      await window.sendEmailVerification(user);
      mostrarModalNotificacion("Correo reenviado", "Te enviamos un nuevo enlace a tu casilla de Gmail.");
    } catch (err) {
      mostrarModalNotificacion("Espera un momento", "Por favor espera unos segundos antes de solicitar otro correo.");
    }
  });

  // 🔄 COMPROBACIÓN AUTOMÁTICA EN SEGUNDO PLANO (Cada 3 segundos)
  intervaloVerificacion = setInterval(async () => {
    try {
      await user.reload(); // Revalida con Firebase
      // Si el modal ya se cerró mientras esperábamos, no hacemos nada
      if (!document.getElementById('modal-verificacion')) return;
      if (user.emailVerified) {
        cerrarModal(); // Se destruye la ventana
        mostrarModalNotificacion("¡Correo verificado!", "Tu cuenta ha sido confirmada con éxito.");
        await continuarTrasLogin(user); // Perfil guardado → dashboard; si no, configuración
      }
    } catch (error) {
      console.error("Error al comprobar verificación automática:", error);
    }
  }, 3000);
}

async function cargarComunidadDesdeFirestore() {
  if (!window.db || !window.collection || !window.getDocs) return;

  try {
    const querySnapshot = await window.getDocs(window.collection(window.db, "perfiles"));
    const usuariosReales = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      usuariosReales.push({
        name: data.displayName || "Usuario de Librito",
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
    console.error("Error al cargar los usuarios de la comunidad desde Firestore:", error);
  }
}
