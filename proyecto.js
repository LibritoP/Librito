// Rutas de imágenes del logo
const LOGO_DIA = 'libritol.png';
const LOGO_NOCHE = 'libritos1.png';

// Estado actual del formulario ('login' o 'register')
let currentMode = 'login';

// Función para alternar el Tema y la Imagen
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const logoImg = document.getElementById('app-logo');
  const isDark = body.classList.contains('theme-dark');

  if (isDark) {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    themeIcon.className = 'ri-moon-fill';
    logoImg.src = LOGO_DIA;
  } else {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    themeIcon.className = 'ri-sun-fill';
    logoImg.src = LOGO_NOCHE;
  }
}

// =============================================================================
// CAMBIO INTERACTIVO ENTRE LOGIN Y REGISTRO
// =============================================================================
function setAuthMode(mode) {
  currentMode = mode;
  const groupUsername = document.getElementById('group-username');
  const btnSubmit = document.getElementById('btn-submit');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const msgBox = document.getElementById('message-box');

  // Ocultar mensajes previos
  msgBox.style.display = 'none';

  if (mode === 'register') {
    groupUsername.style.display = 'flex';
    btnSubmit.textContent = 'REGISTRARSE';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
  } else {
    groupUsername.style.display = 'none';
    btnSubmit.textContent = 'INGRESAR';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  }
}

// =============================================================================
// LÓGICA DE PROCESAMIENTO DE FORMULARIO
// =============================================================================
function handleSubmit(event) {
  event.preventDefault();

  const email = document.getElementById('user-email').value.trim();
  const password = document.getElementById('user-password').value.trim();
  const username = document.getElementById('user-name').value.trim();

  let profileName = '';

  if (currentMode === 'register') {
    // Si se registra, el nombre de usuario ingresado será la referencia del perfil
    profileName = username !== '' ? username : (email ? email.split('@')[0] : 'Usuario');
    showMessage(`¡Cuenta creada con éxito! Bienvenido, ${profileName}...`, 'success');
  } else {
    // Si es inicio de sesión, usa el correo/nombre si existe
    profileName = email ? email.split('@')[0] : 'Usuario';
    showMessage(`¡Inicio de sesión exitoso! Cargando panel de ${profileName}...`, 'success');
  }

  // Transición provisoria hacia el Dashboard pasando el nombre de usuario referente
  setTimeout(() => {
    showDashboard(profileName);
  }, 1000);
}

function handleGoogleLogin() {
  /*
  * =========================================================================
  * [MODIFICAR FUTURO]: INTEGRACIÓN CON GOOGLE SIGN-IN
  * -------------------------------------------------------------------------
  * Sirve tanto para inicio de sesión como para registro automático.
  * =========================================================================
  */
  showMessage('¡Sesión con Google iniciada correctamente!', 'success');
  setTimeout(() => {
    showDashboard('Usuario Google');
  }, 1000);
}

// Transición de vistas (Oculta Auth, muestra Dashboard)
function showDashboard(userName) {
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
  document.getElementById('welcome-user-text').textContent = `¡Bienvenido/a, ${userName}!`;
}

// Cerrar sesión y volver al Auth
function handleLogout() {
  document.getElementById('dashboard-view').style.display = 'none';
  document.getElementById('auth-view').style.display = 'flex';
  
  const msgBox = document.getElementById('message-box');
  msgBox.className = 'message-box';
  msgBox.style.display = 'none';
}

function showMessage(text, type) {
  const msgBox = document.getElementById('message-box');
  msgBox.textContent = text;
  msgBox.className = `message-box ${type}`;
  msgBox.style.display = 'block';
}